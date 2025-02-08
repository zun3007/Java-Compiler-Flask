// Global state
let openFiles = new Map();
let activeFile = null;

// Java keywords and common classes for auto-completion
const javaKeywords = [
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
];

const javaClasses = [
  'String',
  'System',
  'Scanner',
  'BufferedReader',
  'PrintWriter',
  'FileReader',
  'FileWriter',
  'ArrayList',
  'HashMap',
  'List',
  'Map',
  'Set',
  'Queue',
  'Stack',
  'Vector',
  'Collections',
  'Arrays',
  'Math',
  'Random',
  'Exception',
  'RuntimeException',
  'IOException',
  'File',
];

// Initialize CodeMirror
const editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
  mode: 'text/x-java',
  theme: 'monokai',
  lineNumbers: true,
  lineWrapping: true,
  autoCloseBrackets: true,
  matchBrackets: true,
  foldGutter: true,
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  extraKeys: {
    'Ctrl-Space': 'autocomplete',
    'Ctrl-Q': (cm) => cm.foldCode(cm.getCursor()),
    'Ctrl-F': 'findPersistent',
    'Ctrl-H': 'replace',
    'Alt-F': 'findPersistent',
    'Alt-G': 'jumpToLine',
    Tab: (cm) => {
      if (cm.somethingSelected()) {
        cm.indentSelection('add');
      } else {
        cm.replaceSelection('    ');
      }
    },
  },
  indentUnit: 4,
  tabSize: 4,
  indentWithTabs: true,
  autoCloseTags: true,
  matchTags: true,
  highlightSelectionMatches: {
    showToken: /\w/,
    annotateScrollbar: true,
  },
});

// Editor event handlers
editor.on('inputRead', (cm, change) => {
  if (change.text.length === 1 && /[\w.]/.test(change.text[0])) {
    CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
  }
});

editor.on('cursorActivity', (cm) => {
  const pos = cm.getCursor();
  document.getElementById('cursor-position').textContent = `Ln ${
    pos.line + 1
  }, Col ${pos.ch + 1}`;
});

// Custom hint function for Java
CodeMirror.registerHelper('hint', 'text/x-java', (editor, options) => {
  const cursor = editor.getCursor();
  const token = editor.getTokenAt(cursor);
  const start = token.start;
  const end = cursor.ch;
  const line = cursor.line;
  const currentWord = token.string;

  const wordList = [...javaKeywords, ...javaClasses].filter((word) =>
    word.toLowerCase().startsWith(currentWord.toLowerCase())
  );

  return {
    list: wordList,
    from: CodeMirror.Pos(line, start),
    to: CodeMirror.Pos(line, end),
  };
});

// Editor functions
const formatCode = () => {
  try {
    const code = editor.getValue();
    const formatted = prettier.format(code, {
      parser: 'java',
      plugins: prettierPlugins,
      tabWidth: 4,
    });
    editor.setValue(formatted);
  } catch (error) {
    console.error('Format error:', error);
  }
};

const toggleFold = () => {
  const pos = editor.getCursor();
  editor.foldCode(pos);
};

const findReplace = () => {
  CodeMirror.commands.findPersistent(editor);
};

const jumpToLine = () => {
  CodeMirror.commands.jumpToLine(editor);
};

// File management
async function loadFiles() {
  try {
    const response = await fetch('/api/files');
    const data = await response.json();
    const fileList = document.getElementById('file-list');
    fileList.innerHTML = '';

    data.files.forEach((file) => {
      const fileDiv = document.createElement('div');
      fileDiv.className = 'file-item';
      fileDiv.innerHTML = `
        <span onclick="openFile('${file.name}', ${JSON.stringify(
        file.content
      ).replace(/"/g, '&quot;')}">
          ${getFileIcon(file.name)}${file.name}
        </span>
        <button 
          class="btn btn-sm btn-danger" 
          onclick="deleteFile('${file.name}')"
          data-tooltip="Delete file"
          aria-label="Delete ${file.name}"
        >
          <i class="fas fa-trash"></i>
        </button>
      `;
      fileList.appendChild(fileDiv);
    });
  } catch (error) {
    console.error('Error loading files:', error);
  }
}

async function createNewFile() {
  const filename = prompt('Enter file name:');
  if (!filename) return;

  try {
    await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: filename, content: '' }),
    });
    loadFiles();
    openFile(filename, '');
  } catch (error) {
    console.error('Error creating file:', error);
  }
}

function openFile(filename, content) {
  if (!openFiles.has(filename)) {
    openFiles.set(filename, content);
    addTab(filename);
  }
  switchToFile(filename);
}

async function deleteFile(filename) {
  if (!confirm(`Delete ${filename}?`)) return;

  try {
    await fetch(`/api/files/${filename}`, { method: 'DELETE' });
    closeFile(filename);
    loadFiles();
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// Tab management
function addTab(filename) {
  const tabBar = document.getElementById('tab-bar');
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.innerHTML = `
    <span onclick="switchToFile('${filename}')">${filename}</span>
    <span class="close-btn" onclick="closeFile('${filename}')">&times;</span>
  `;
  tabBar.appendChild(tab);
}

function switchToFile(filename) {
  activeFile = filename;
  editor.setValue(openFiles.get(filename) || '');
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle(
      'active',
      tab.querySelector('span').textContent === filename
    );
  });
}

function closeFile(filename) {
  openFiles.delete(filename);
  const tabs = document.getElementById('tab-bar');
  const tab = Array.from(tabs.children).find(
    (t) => t.querySelector('span').textContent === filename
  );
  if (tab) tab.remove();

  if (activeFile === filename) {
    const nextFile = openFiles.keys().next().value;
    if (nextFile) {
      switchToFile(nextFile);
    } else {
      editor.setValue('');
      activeFile = null;
    }
  }
}

// File upload handling
function initializeFileUpload() {
  const fileUpload = document.getElementById('file-upload');
  const uploadLabel = document.getElementById('upload-label');
  const uploadText = document.getElementById('upload-text');

  uploadLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadLabel.style.borderColor = '#0d6efd';
  });

  uploadLabel.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadLabel.style.borderColor = '#ddd';
  });

  uploadLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadLabel.style.borderColor = '#ddd';
    handleFile(e.dataTransfer.files[0]);
  });

  fileUpload.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
  });
}

async function handleFile(file) {
  if (!file) return;

  const uploadText = document.getElementById('upload-text');
  uploadText.textContent = `Selected: ${file.name}`;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          content: e.target.result,
        }),
      });
      loadFiles();
      openFile(file.name, e.target.result);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };
  reader.readAsText(file);
}

// Run code handling
async function runCode() {
  const runBtn = document.getElementById('run-btn');
  const runBtnText = document.getElementById('run-btn-text');
  const runBtnSpinner = document.getElementById('run-btn-spinner');
  const outputDiv = document.getElementById('output');
  const fileOutputList = document.getElementById('file-output-list');
  const programInput = document.getElementById('program-input');

  runBtn.disabled = true;
  runBtnText.textContent = 'Running...';
  runBtnSpinner.classList.remove('d-none');
  outputDiv.innerHTML = 'Compiling and running...';

  try {
    const files = Array.from(openFiles.entries()).map(([name, content]) => ({
      name,
      content,
    }));

    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: editor.getValue(),
        input: programInput.value,
        files: files,
      }),
    });

    const result = await response.json();

    if (result.success) {
      outputDiv.innerHTML = `<pre class="success">${
        result.output || 'Program executed successfully with no output.'
      }</pre>`;

      if (result.files && Object.keys(result.files).length > 0) {
        let filesHtml = '<div class="mt-3">';
        for (const [filename, content] of Object.entries(result.files)) {
          filesHtml += `
            <div class="card mb-2">
              <div class="card-header">${filename}</div>
              <div class="card-body">
                <pre>${content}</pre>
              </div>
            </div>`;
        }
        filesHtml += '</div>';
        fileOutputList.innerHTML = filesHtml;
      } else {
        fileOutputList.innerHTML = 'No output files generated.';
      }
    } else {
      outputDiv.innerHTML = `<pre class="error">Error: ${result.error}</pre>`;
      fileOutputList.innerHTML = 'No output files generated.';
    }
  } catch (error) {
    outputDiv.innerHTML = `<pre class="error">Error: ${error.message}</pre>`;
    fileOutputList.innerHTML = 'No output files generated.';
  } finally {
    runBtn.disabled = false;
    runBtnText.textContent = 'Run Code';
    runBtnSpinner.classList.add('d-none');
  }
}

// Utility functions
function getFileIcon(filename) {
  const ext = filename.split('.').pop();
  const icons = {
    java: 'fa-java',
    txt: 'fa-file-alt',
    in: 'fa-file-import',
    out: 'fa-file-export',
  };
  return `<i class="fab ${icons[ext] || 'fa-file'} file-icon file-${ext}"></i>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadFiles();
  initializeFileUpload();
  document.getElementById('run-btn').addEventListener('click', runCode);
});
