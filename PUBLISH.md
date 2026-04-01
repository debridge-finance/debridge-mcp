# Publishing

## npm

```bash
npm publish
```

## MCP Registry

Update the server listing at https://registry.modelcontextprotocol.io/

### Prerequisites

Install the `mcp-publisher` CLI:

```bash
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher && sudo mv mcp-publisher /usr/local/bin/
```

Authenticate with GitHub:

```bash
mcp-publisher login github
```

### Publish

The registry entry is defined in `server.json`. To publish or update:

```bash
mcp-publisher publish
```

### Other commands

```bash
mcp-publisher validate   # validate server.json without publishing
mcp-publisher status     # update the status of a server version
mcp-publisher logout     # clear saved authentication
```
