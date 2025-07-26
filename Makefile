# Makefile for the json5-server project

# Variables
APP_NAME = json5-server
HOST = localhost
PORT = 8000
DIR = .

# Default target
all: build

build:
	deno task build

install:
	deno task install

# Start the application using deno run
start:
	deno task start --host $(HOST) --port $(PORT) --dir $(DIR)

# Run tests
test:
	deno test --allow-read --allow-import --allow-net

# Clean up build artifacts
clean:
	rm -f $(APP_NAME)

.PHONY: all build install start test clean
