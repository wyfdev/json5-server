# Makefile for the json5-server project

# Variables
APP_NAME = json5-server
ENTRY_POINT = main.ts
HOST = localhost
PORT = 8000
DIR = .

# Default target
all: build

# Build the executable
build:
	deno compile --allow-all --output $(APP_NAME) $(ENTRY_POINT)

# Run the compiled application
run: build
	./$(APP_NAME) --host $(HOST) --port $(PORT) --dir $(DIR)

# Start the application using deno run
start:
	deno run --allow-all $(ENTRY_POINT) --host $(HOST) --port $(PORT) --dir $(DIR)

# Run tests
test:
	deno test --allow-read --allow-import

# Clean up build artifacts
clean:
	rm -f $(APP_NAME)

.PHONY: all build run start test clean
