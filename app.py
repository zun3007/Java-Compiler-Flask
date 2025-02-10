import os
import subprocess
import uuid
import shutil
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
import json
import concurrent.futures

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'compiled'
WORKSPACE_FOLDER = 'workspace'  # For storing user files
ALLOWED_EXTENSIONS = {'java', 'txt', 'in', 'out'}  # Added support for input/output files
MAX_CONTENT_LENGTH = 512 * 1024 * 1024  # 512MB max-length
COMPILATION_TIMEOUT = 10  # seconds
EXECUTION_TIMEOUT = 5  # seconds

# Create necessary folders
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(WORKSPACE_FOLDER, exist_ok=True)

# Optimization: Create a thread pool executor for parallel compilation
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_workspace_files():
    files = []
    for root, dirs, filenames in os.walk(WORKSPACE_FOLDER):
        for filename in filenames:
            full_path = os.path.join(root, filename)
            rel_path = os.path.relpath(full_path, WORKSPACE_FOLDER)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            files.append({
                'name': filename,
                'path': rel_path,
                'content': content
            })
    return files

def compile_java_file(java_file_path):
    """Compile a single Java file and return compilation time"""
    compile_start = time.perf_counter()
    result = subprocess.run(
        ['javac', java_file_path],
        capture_output=True,
        text=True,
        timeout=COMPILATION_TIMEOUT
    )
    compile_time = time.perf_counter() - compile_start
    return result, compile_time

def compile_and_run_java(code, files=None, stdin_data=None):
    # Create a unique temporary directory
    temp_dir = os.path.join(UPLOAD_FOLDER, str(uuid.uuid4()))
    os.makedirs(temp_dir, exist_ok=True)
    
    metrics = {
        'compilation_time': 0,
        'execution_time': 0,
        'total_time': 0
    }
    
    total_start = time.perf_counter()
    
    try:
        # Write the main code file
        java_file_path = os.path.join(temp_dir, "Main.java")
        with open(java_file_path, 'w') as f:
            f.write(code)
        
        # Write additional files if provided
        java_files_to_compile = [java_file_path]
        if files:
            for file_info in files:
                file_path = os.path.join(temp_dir, file_info['name'])
                with open(file_path, 'w') as f:
                    f.write(file_info['content'])
                if file_info['name'].endswith('.java'):
                    java_files_to_compile.append(file_path)
        
        # Parallel compilation of Java files
        compilation_start = time.perf_counter()
        compilation_futures = [
            executor.submit(compile_java_file, file_path)
            for file_path in java_files_to_compile
        ]
        
        # Wait for all compilations to complete
        for future in concurrent.futures.as_completed(compilation_futures):
            result, compile_time = future.result()
            if result.returncode != 0:
                return {
                    'success': False,
                    'error': f"Compilation error: {result.stderr}",
                    'output': None,
                    'metrics': metrics
                }
        
        metrics['compilation_time'] = time.perf_counter() - compilation_start
        
        # Run the compiled Java program with input if provided
        execution_start = time.perf_counter()
        run_process = subprocess.run(
            ['java', '-cp', temp_dir, 'Main'],
            input=stdin_data,
            capture_output=True,
            text=True,
            timeout=EXECUTION_TIMEOUT
        )
        
        metrics['execution_time'] = time.perf_counter() - execution_start
        
        if run_process.returncode != 0:
            return {
                'success': False,
                'error': f"Runtime error: {run_process.stderr}",
                'output': None,
                'metrics': metrics
            }
        
        # Check for any output files created by the program
        output_files = {}
        for filename in os.listdir(temp_dir):
            if filename.endswith('.out') or filename.endswith('.txt'):
                file_path = os.path.join(temp_dir, filename)
                with open(file_path, 'r') as f:
                    output_files[filename] = f.read()
        
        metrics['total_time'] = time.perf_counter() - total_start
        
        return {
            'success': True,
            'output': run_process.stdout,
            'error': None,
            'files': output_files,
            'metrics': metrics
        }
    
    except subprocess.TimeoutExpired as e:
        metrics['total_time'] = time.perf_counter() - total_start
        return {
            'success': False,
            'error': 'Execution timed out',
            'output': None,
            'metrics': metrics
        }
    except Exception as e:
        metrics['total_time'] = time.perf_counter() - total_start
        return {
            'success': False,
            'error': str(e),
            'output': None,
            'metrics': metrics
        }
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.route('/api/compile', methods=['POST'])
def compile_code():
    if not request.is_json:
        return jsonify({
            'success': False,
            'error': 'Content-Type must be application/json',
            'output': None,
            'metrics': {'total_time': 0}
        }), 400
    
    data = request.get_json()
    
    if 'code' not in data:
        return jsonify({
            'success': False,
            'error': 'No code provided',
            'output': None,
            'metrics': {'total_time': 0}
        }), 400
    
    code = data['code']
    stdin_data = data.get('input', '')
    files = data.get('files', [])
    
    # Basic input validation
    if not code or len(code) > MAX_CONTENT_LENGTH:
        return jsonify({
            'success': False,
            'error': f'Code must be between 1 and {MAX_CONTENT_LENGTH} bytes',
            'output': None,
            'metrics': {'total_time': 0}
        }), 400
    
    result = compile_and_run_java(code, files, stdin_data)
    return jsonify(result)

@app.route('/api/files', methods=['GET'])
def list_files():
    files = get_workspace_files()
    return jsonify({'files': files})

@app.route('/api/files', methods=['POST'])
def create_file():
    data = request.get_json()
    if not data or 'name' not in data or 'content' not in data:
        return jsonify({'error': 'Invalid request'}), 400
    
    filename = secure_filename(data['name'])
    file_path = os.path.join(WORKSPACE_FOLDER, filename)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(data['content'])
    
    return jsonify({'success': True})

@app.route('/api/files/<path:filename>', methods=['PUT'])
def update_file(filename):
    data = request.get_json()
    if not data or 'content' not in data:
        return jsonify({'error': 'Invalid request'}), 400
    
    file_path = os.path.join(WORKSPACE_FOLDER, secure_filename(filename))
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(data['content'])
    
    return jsonify({'success': True})

@app.route('/api/files/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = os.path.join(WORKSPACE_FOLDER, secure_filename(filename))
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({'success': True})
    return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    app.run(debug=True) 