# Java Compiler API

This project provides a web API for compiling and running Java code, along with a template website for testing the functionality.

## Prerequisites

- Python 3.8 or higher
- Java Development Kit (JDK) 11 or higher
- pip (Python package manager)

## Setup

1. Clone the repository:

```bash
git clone https://github.com/zun3007/Java-Compiler-Flask
cd java-compiler-api
```

2. Create a virtual environment and activate it:

```bash
python -m venv venv
# On Windows
.\venv\Scripts\activate
# On Unix or MacOS
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the application:

```bash
python app.py
```

The API will be available at `http://localhost:5000`
The template website will be available at `http://localhost:5000/static/index.html`

## API Endpoints

### POST /api/compile

Compiles and runs Java code.

Request body:

```json
{
  "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World!\"); } }"
}
```

Response:

```json
{
  "success": true,
  "output": "Hello, World!",
  "error": null
}
```

## Security Considerations

- The API implements rate limiting and input validation
- Java code execution is sandboxed
- System commands are restricted
- Maximum execution time is limited

## License

MIT License
