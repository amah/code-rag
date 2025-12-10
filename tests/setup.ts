/**
 * Test setup and utilities
 */

// Sample code snippets for testing parsers
export const sampleCode = {
  typescript: `
/**
 * Calculator class for basic math operations
 */
export class Calculator {
  private value: number;

  constructor(initialValue: number = 0) {
    this.value = initialValue;
  }

  /**
   * Adds a number to the current value
   */
  add(n: number): Calculator {
    this.value += n;
    return this;
  }

  /**
   * Subtracts a number from the current value
   */
  subtract(n: number): Calculator {
    this.value -= n;
    return this;
  }

  getValue(): number {
    return this.value;
  }
}

/**
 * Utility function to create a calculator
 */
export function createCalculator(initial?: number): Calculator {
  return new Calculator(initial);
}

interface MathOperation {
  execute(a: number, b: number): number;
}

enum OperationType {
  ADD = 'add',
  SUBTRACT = 'subtract',
  MULTIPLY = 'multiply',
}
`.trim(),

  java: `
package com.example.calculator;

import java.util.List;
import java.util.ArrayList;

/**
 * Calculator class for basic math operations
 */
public class Calculator {
    private double value;

    public Calculator() {
        this.value = 0;
    }

    public Calculator(double initialValue) {
        this.value = initialValue;
    }

    /**
     * Adds a number to the current value
     * @param n the number to add
     * @return this calculator for chaining
     */
    public Calculator add(double n) {
        this.value += n;
        return this;
    }

    /**
     * Subtracts a number from the current value
     */
    public Calculator subtract(double n) {
        this.value -= n;
        return this;
    }

    public double getValue() {
        return this.value;
    }
}
`.trim(),

  python: `
"""Calculator module for basic math operations."""

from typing import Optional


class Calculator:
    """Calculator class for basic math operations."""

    def __init__(self, initial_value: float = 0):
        """Initialize calculator with optional initial value."""
        self.value = initial_value

    def add(self, n: float) -> "Calculator":
        """Add a number to the current value."""
        self.value += n
        return self

    def subtract(self, n: float) -> "Calculator":
        """Subtract a number from the current value."""
        self.value -= n
        return self

    def get_value(self) -> float:
        """Get the current value."""
        return self.value


def create_calculator(initial: Optional[float] = None) -> Calculator:
    """Create a new calculator instance."""
    return Calculator(initial or 0)
`.trim(),

  sql: `
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'pending'
);

-- Insert sample data
INSERT INTO users (email, name) VALUES ('test@example.com', 'Test User');
`.trim(),

  yaml: `
database:
  host: localhost
  port: 5432
  name: myapp
  credentials:
    username: admin
    password: secret

server:
  port: 3000
  host: 0.0.0.0

features:
  enableCache: true
  maxConnections: 100
`.trim(),

  json: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "start": "node index.js",
    "build": "tsc"
  }
}`.trim(),
};

// Mock repository for testing
export const mockRepository = {
  name: "test-repo",
  path: "/tmp/test-repo",
  branch: "main",
  commit: "abc123def456",
  microservice: "test-service",
  tags: ["test", "unit"],
};

// Mock file info for testing
export const mockFileInfo = {
  typescript: {
    absolutePath: "/tmp/test-repo/src/calculator.ts",
    relativePath: "src/calculator.ts",
    language: "typescript" as const,
    extension: ".ts",
  },
  java: {
    absolutePath: "/tmp/test-repo/src/Calculator.java",
    relativePath: "src/Calculator.java",
    language: "java" as const,
    extension: ".java",
  },
  python: {
    absolutePath: "/tmp/test-repo/src/calculator.py",
    relativePath: "src/calculator.py",
    language: "python" as const,
    extension: ".py",
  },
};
