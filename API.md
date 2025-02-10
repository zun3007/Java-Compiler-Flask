# Java Compiler API Documentation

## Overview

This API provides endpoints for compiling and running Java code, along with file management capabilities. It's designed to support a web-based Java IDE environment with runtime performance metrics.

## Base URL

```
http://localhost:5000
```

## Authentication

Currently, no authentication is required.

## Rate Limiting

No explicit rate limiting is implemented.

## API Endpoints

### 1. Compile and Run Java Code

Compiles and executes Java code with support for multiple files and input data. Includes detailed runtime metrics.

**Endpoint:** `POST /api/compile`

**Request Body:**

```json
{
  "code": "string", // Required: Main Java code to compile and run
  "input": "string", // Optional: Input data for program
  "files": [
    // Optional: Additional files
    {
      "name": "string", // Required: File name with extension
      "content": "string" // Required: File content
    }
  ]
}
```

**Response:**

```json
{
  "success": boolean,    // Indicates if compilation/execution was successful
  "output": "string",    // Program output (if successful)
  "error": "string",     // Error message (if unsuccessful)
  "files": {            // Generated output files (if any)
    "filename": "content"
  },
  "metrics": {          // Runtime performance metrics
    "compilation_time": number,  // Time taken for compilation (seconds)
    "execution_time": number,    // Time taken for execution (seconds)
    "total_time": number        // Total processing time (seconds)
  }
}
```

**Example Request:**

```javascript
fetch('/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `
      public class Main {
          public static void main(String[] args) {
              System.out.println("Hello, World!");
          }
      }
    `,
    input: '',
    files: [],
  }),
});
```

**Performance Optimizations:**

- Parallel compilation for multiple Java files
- Thread pool executor with 4 workers
- Efficient file handling
- Detailed runtime metrics tracking

**Possible Errors:**

- 400: Invalid request body
- 400: Code size exceeds limit
- 500: Compilation error
- 500: Runtime error
- 500: Timeout error

### 2. List Files

Retrieves all files in the workspace.

**Endpoint:** `GET /api/files`

**Response:**

```json
{
  "files": [
    {
      "name": "string", // File name
      "path": "string", // Relative path in workspace
      "content": "string" // File content
    }
  ]
}
```

### 3. Create File

Creates a new file in the workspace.

**Endpoint:** `POST /api/files`

**Request Body:**

```json
{
  "name": "string", // Required: File name with extension
  "content": "string" // Required: File content
}
```

**Response:**

```json
{
  "success": boolean
}
```

**Possible Errors:**

- 400: Invalid request body
- 400: Invalid file name
- 400: File size exceeds limit

### 4. Update File

Updates the content of an existing file.

**Endpoint:** `PUT /api/files/{filename}`

**URL Parameters:**

- filename: Name of the file to update

**Request Body:**

```json
{
  "content": "string" // Required: New file content
}
```

**Response:**

```json
{
  "success": boolean
}
```

**Possible Errors:**

- 400: Invalid request body
- 404: File not found
- 400: File size exceeds limit

### 5. Delete File

Deletes a file from the workspace.

**Endpoint:** `DELETE /api/files/{filename}`

**URL Parameters:**

- filename: Name of the file to delete

**Response:**

```json
{
  "success": boolean
}
```

**Possible Errors:**

- 404: File not found

## Technical Specifications

### Performance Constraints

- Parallel compilation with 4 worker threads
- Compilation timeout: 10 seconds
- Execution timeout: 5 seconds
- Runtime metrics precision: 3 decimal places

### Runtime Metrics

The API provides detailed runtime metrics for each compilation and execution:

- `compilation_time`: Time taken to compile all Java files
- `execution_time`: Time taken to run the compiled program
- `total_time`: Total processing time including I/O operations

### File Constraints

- Maximum file size: 512MB
- Allowed file extensions: `.java`, `.txt`, `.in`, `.out`

### Security

- All filenames are sanitized
- Code execution is sandboxed
- CORS is enabled
- Thread pool isolation

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Best Practices

1. Always check the `success` field in responses
2. Handle timeouts gracefully
3. Implement proper error handling
4. Validate file sizes before upload
5. Use appropriate file extensions

## Example Usage

### Complete Example with Multiple Files

```javascript
// Example: Compiling a Java program with input file
const mainCode = `
public class Main {
    public static void main(String[] args) {
        java.util.Scanner scanner = new java.util.Scanner(System.in);
        while (scanner.hasNextLine()) {
            System.out.println(scanner.nextLine().toUpperCase());
        }
    }
}`;

const inputData = 'Hello\nWorld';

fetch('/api/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: mainCode,
    input: inputData,
    files: [],
  }),
})
  .then((response) => response.json())
  .then((result) => {
    if (result.success) {
      console.log('Output:', result.output);
      console.log('Generated files:', result.files);
    } else {
      console.error('Error:', result.error);
    }
  })
  .catch((error) => console.error('API Error:', error));
```

## Support

For API support or to report issues, please contact Dũng or Zun3007.

## Changelog

### Version 1.0.0

- Initial API release
- Basic compilation and file management features
- Support for multiple files and input data
