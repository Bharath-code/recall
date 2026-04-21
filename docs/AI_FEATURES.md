# AI Features Documentation

Recall includes optional AI-powered features that enhance command search and error handling. All AI features are designed to gracefully fallback to non-AI alternatives when unavailable.

## Overview

Recall's AI features are:
- **Privacy-first**: Local ONNX models available without API keys
- **Provider-agnostic**: Works with OpenAI, Google, Cohere, Ollama, and any OpenAI-compatible endpoint
- **Graceful degradation**: Falls back to keyword search if AI is unavailable
- **Gated by default**: Requires `RECALL_EXPERIMENTAL=1` to enable AI commands

## Commands

### `recall ask` - AI-Powered Semantic Search

Search your command history using natural language queries instead of exact keywords.

```bash
# Enable experimental features
export RECALL_EXPERIMENTAL=1

# Natural language search
recall ask "how do I clean docker images"
recall ask "what was that kubectl command for pods"
recall ask "how did I fix that permission error"
```

**Fallback Behavior**: If AI is unavailable, automatically falls back to keyword search.

### `recall fix` - Error Memory

Shows known fixes for recent command failures based on your past error patterns.

```bash
# Enable experimental features
export RECALL_EXPERIMENTAL=1

# Show fixes for recent errors
recall fix
```

**How it works**: Remembers which commands fixed which errors and suggests them when similar errors occur.

### `recall embed` - Background Embedding Generator

Generates vector embeddings for semantic search. Can run as a one-off batch job or as a daemon.

```bash
# Enable experimental features
export RECALL_EXPERIMENTAL=1

# Generate embeddings for recent commands
recall embed

# Run as daemon (continuously generates embeddings)
recall embed --daemon

# Custom batch size
recall embed --batch-size 500
```

## Configuration

### Environment Variables

#### Universal Configuration (Highest Priority)
```bash
export RECALL_BASE_URL=https://your-provider.com/v1
export RECALL_API_KEY=your-api-key
export RECALL_EMBEDDING_MODEL=model-name
```

#### Named Provider Configuration
```bash
export RECALL_AI_PROVIDER=openai|openrouter|ollama|google|cohere|azure|custom|local
```

#### Provider-Specific Auto-Detection
```bash
# OpenAI
export OPENAI_API_KEY=sk-...

# OpenRouter
export OPENROUTER_API_KEY=sk-or-...

# Google
export GOOGLE_GENERATIVE_AI_API_KEY=AIz...

# Cohere
export COHERE_API_KEY=co-...

# Ollama (local)
export OLLAMA_HOST=http://localhost:11434
```

### Local ONNX (No API Key)

For privacy-first local embeddings without any external service:

```bash
# Install the local embedder
bun add @xenova/transformers

# Use local provider
export RECALL_AI_PROVIDER=local
```

The local provider uses the Xenova/all-MiniLM-L6-v2 model (384 dimensions) and runs entirely in-process.

### Provider-Specific Models

| Provider | Default Model | Notes |
|----------|--------------|-------|
| OpenAI | text-embedding-3-small | 1536 dimensions |
| OpenRouter | openai/text-embedding-3-small | Routes to OpenAI |
| Google | text-embedding-004 | 768 dimensions |
| Cohere | embed-english-v3.0 | 1024 dimensions |
| Ollama | nomic-embed-text | 768 dimensions |
| Local | all-MiniLM-L6-v2 | 384 dimensions |

**Important**: Vector dimensions must match between the model used for embedding and search. Mixing models will cause incorrect results.

## Setup Examples

### OpenAI
```bash
export OPENAI_API_KEY=sk-...
recall ask "how do I restart the server"
```

### Ollama (Fully Local)
```bash
# Pull the embedding model
ollama pull nomic-embed-text

# Set provider
export RECALL_AI_PROVIDER=ollama

# Run Recall
recall ask "database migration command"
```

### Google
```bash
export GOOGLE_GENERATIVE_AI_API_KEY=AIz...
recall ask "docker compose command"
```

### Custom OpenAI-Compatible Endpoint
```bash
export RECALL_BASE_URL=https://your-custom-endpoint.com/v1
export RECALL_API_KEY=your-key
export RECALL_EMBEDDING_MODEL=your-model
recall ask "git rebase command"
```

## Error Handling

Recall's AI features include robust error handling:

- **Timeout protection**: 10s timeout for provider initialization, 15s for search
- **Automatic fallback**: Falls back to keyword search if AI fails
- **Configuration validation**: Validates AI config before attempting to use it
- **Silent failures**: Errors are logged but don't break the CLI

Example error output:
```
[recall] AI provider 'openai' unavailable: API key not found
[recall] Falling back to keyword search.
```

## Performance

- **Local ONNX**: ~100ms per embedding, runs entirely in-process
- **Cloud providers**: ~200-500ms per embedding (network dependent)
- **Keyword search**: <10ms (always available)
- **Semantic search**: ~50ms for 2000 vectors (cosine similarity)

## Troubleshooting

### AI Features Not Showing
Ensure experimental features are enabled:
```bash
export RECALL_EXPERIMENTAL=1
```

### "AI provider unavailable" Error
Check your configuration:
- Verify API key is set
- Verify base URL is correct (if using custom endpoint)
- Check network connectivity
- Verify provider is supported

### No Semantic Results
- Ensure embeddings have been generated: `recall embed`
- Check that the embedding model matches the one used for search
- Try rephrasing your query
- Fall back to keyword search: `recall search <keyword>`

### Vector Dimension Mismatch
If you switch embedding models, you must regenerate all embeddings:
```bash
# Delete existing embeddings
sqlite3 ~/.recall/recall.db "DELETE FROM embeddings;"

# Regenerate with new model
recall embed
```

## Privacy Considerations

- **Local ONNX**: All processing happens on your machine. No data leaves your system.
- **Cloud providers**: Commands are sent to the provider's API for embedding generation.
- **Data retention**: Embeddings are stored locally in SQLite. Original commands are already in your database.
- **Redaction**: Ensure `redact_secrets` is enabled (default) to avoid embedding sensitive data.

## Future Enhancements

Planned AI features for future releases:

- **Chat-based reasoning**: Ask "why did this command fail?" with context-aware answers
- **Command suggestions**: Suggest commands based on current context and past patterns
- **Workflow synthesis**: Generate multi-step workflows from natural language descriptions
- **Error prediction**: Predict potential errors before running commands
