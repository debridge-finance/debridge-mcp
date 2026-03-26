# deBridge MCP

[![MCP Endpoint](https://img.shields.io/badge/MCP-agents.debridge.com%2Fmcp-7C3AED?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3TDEyIDJ6Ii8+PC9zdmc+&logoColor=white)](https://agents.debridge.com/mcp)
[![llms.txt](https://img.shields.io/badge/llms.txt-agents.debridge.com-4B5563?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTE0IDJIOEM2LjkgMiA2IDIuOSA2IDRWMTBJNI45IDEwLjEgNy44IDExIDkgMTFIMTVDMTYuMiAxMSAxNy4xIDEwLjEgMTcgOVY0QzE3IDIuOSAxNi4xIDIgMTUgMkgxNFYyWk05IDRIMTVWOUg5VjRaTTQgMTVDMi45IDE1IDIgMTUuOSAyIDE3VjIwQzIgMjEuMSAyLjkgMjIgNCAyMkgxMEMxMS4xIDIyIDEyIDIxLjEgMTIgMjBWMTdDMTIgMTUuOSAxMS4xIDE1IDEwIDE1SDRaTTQgMTdIMTBWMjBINFYxN1pNMTQgMTVDMTIuOSAxNSAxMiAxNS45IDEyIDE3VjIwQzEyIDIxLjEgMTIuOSAyMiAxNCAyMkgyMEMyMS4xIDIyIDIyIDIxLjEgMjIgMjBWMTdDMjIgMTUuOSAyMS4xIDE1IDIwIDE1SDE0Wk0xNCAxN0gyMFYyMEgxNFYxN1oiLz48L3N2Zz4=&logoColor=white)](https://agents.debridge.com/llms.txt)
[![Skills](https://img.shields.io/badge/Skills-debridge--skills-181717?logo=github&logoColor=white)](https://github.com/debridge-finance/debridge-skills)
[![npm version](https://img.shields.io/npm/v/@debridge-finance/debridge-mcp?logo=npm&logoColor=white)](https://www.npmjs.com/package/@debridge-finance/debridge-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-8A2BE2?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3TDEyIDJ6Ii8+PC9zdmc+)](https://registry.modelcontextprotocol.io/?q=io.github.debridge-finance%2Fdebridge-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/debridge-finance/debridge-mcp?style=flat&logo=github)](https://github.com/debridge-finance/debridge-mcp)

[deBridge](https://debridge.com) MCP integration for AI agents — cross-chain and same-chain swaps, fee estimation, and trade execution across major blockchain networks.

The hosted MCP endpoint is available at [agents.debridge.com](https://agents.debridge.com). This npm package is a thin proxy client for agents that require a local stdio or HTTP process.

https://github.com/user-attachments/assets/8ebe88ff-db3c-455e-9efb-50389e4bf5bd

## Connecting to deBridge MCP

### Recommended: Direct connection (Streamable HTTP)

Connect your agent directly to the hosted endpoint — no installation, no local process:

```
https://agents.debridge.com/mcp
```

This is a [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) MCP endpoint. It exposes tools (`get_instructions`, `search_tokens`, `get_supported_chains`, `create_tx`, `transaction_same_chain_swap`), workflow skills via MCP resources, and an [llms.txt](https://agents.debridge.com/llms.txt) overview. Tools and skills are maintained in the [debridge-finance/debridge-skills](https://github.com/debridge-finance/debridge-skills) repository.

**Generic Streamable HTTP configuration:**

```json
"debridge": {
  "type": "streamable-http",
  "url": "https://agents.debridge.com/mcp"
}
```

<details>
<summary>Claude Code (CLI & IDE plugins)</summary>

```bash
claude mcp add debridge --transport http https://agents.debridge.com/mcp
```

Verify:

```bash
claude mcp list
```

</details>

<details>
<summary>Claude Web & Desktop Apps</summary>

Add as a remote MCP server with the URL `https://agents.debridge.com/mcp`.

</details>

<details>
<summary>Cursor</summary>

Add to `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally:

```json
{
  "mcpServers": {
    "debridge": {
      "url": "https://agents.debridge.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>GitHub Copilot (VS Code Chat)</summary>

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "debridge": {
      "type": "streamable-http",
      "url": "https://agents.debridge.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>Windsurf</summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "debridge": {
      "type": "streamable-http",
      "url": "https://agents.debridge.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>Cline</summary>

Open Cline settings in VS Code, go to MCP Servers, click "Edit MCP Settings" and add:

```json
{
  "mcpServers": {
    "debridge": {
      "type": "streamable-http",
      "url": "https://agents.debridge.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>Continue</summary>

Add to `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "debridge",
      "transport": "streamable-http",
      "url": "https://agents.debridge.com/mcp"
    }
  ]
}
```

</details>

<details>
<summary>Zed</summary>

Add to your Zed settings (`~/.config/zed/settings.json`):

```json
{
  "context_servers": {
    "debridge": {
      "transport": "streamable-http",
      "url": "https://agents.debridge.com/mcp"
    }
  }
}
```

</details>

<details>
<summary>OpenClaw (via mcp-adapter plugin)</summary>

Install the [mcp-adapter](https://github.com/androidStern-personal/openclaw-mcp-adapter) plugin:
```bash
openclaw plugins install mcp-adapter
```

Add to `~/.openclaw/openclaw.json`:
```json
{
  "plugins": {
    "entries": {
      "mcp-adapter": {
        "enabled": true,
        "config": {
          "servers": [
            {
              "name": "debridge",
              "transport": "streamable-http",
              "url": "https://agents.debridge.com/mcp"
            }
          ]
        }
      }
    }
  }
}
```

</details>

---

### Alternative: Run a local proxy

Some agent frameworks only support stdio transport and cannot connect to a remote HTTP endpoint directly. This npm package bridges that gap — it runs a local MCP process that transparently proxies all requests to `https://agents.debridge.com/mcp`.

Tools and resources are not implemented locally. They are dynamically discovered from the upstream endpoint at startup (stdio) or forwarded per-request (HTTP), so any changes to the hosted MCPd are reflected automatically without updating the package.

#### How the proxy works

- **Stdio mode** (default): Opens a long-lived MCP client connection to the upstream MCPd via `StreamableHTTPClientTransport`. Creates a local `Server` with `StdioServerTransport` that mirrors the upstream capabilities and forwards `tools/list`, `tools/call`, `resources/list`, `resources/read`, and `resources/templates/list` to the upstream.

- **HTTP mode** (`MCP_TRANSPORT=http`): Transparent HTTP reverse proxy via Express. Forwards raw JSON-RPC requests and SSE response streams to the upstream MCPd, passing through `Mcp-Session-Id` headers for session continuity.

#### npx (stdio)

```bash
npx -y @debridge-finance/debridge-mcp@latest
```

**stdio configuration:**

```json
"debridge": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@debridge-finance/debridge-mcp@latest"]
}
```

<details>
<summary>Claude Code (CLI & IDE plugins)</summary>

```bash
claude mcp add debridge npx -- -y @debridge-finance/debridge-mcp@latest
```

</details>

<details>
<summary>Cursor</summary>

Use Cursor Deeplink: [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en-US/install-mcp?name=debridge&config=eyJjb21tYW5kIjoibnB4IC15IEBkZWJyaWRnZS1maW5hbmNlL2RlYnJpZGdlLW1jcEBsYXRlc3QifQ%3D%3D)

OR install from [Cursor Directory](https://cursor.directory/mcp/debridge)

OR add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "debridge": {
      "command": "npx",
      "args": ["-y", "@debridge-finance/debridge-mcp@latest"]
    }
  }
}
```

</details>

#### Docker (HTTP proxy)

```bash
docker build -t debridge-mcp .
docker run -p 3000:3000 debridge-mcp
```

Then connect your agent to `http://localhost:3000/mcp` using the Streamable HTTP configs above.

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REMOTE_MCP_URL` | `https://agents.debridge.com/mcp` | Remote MCP endpoint to proxy to |
| `MCP_TRANSPORT` | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | `3000` | HTTP listen port (HTTP mode only) |
| `HOST` | `0.0.0.0` | HTTP listen host (HTTP mode only) |

## Development

```bash
# Install dependencies
npm install

# Run in dev mode (stdio proxy)
npm run dev

# Run in dev mode (HTTP proxy)
npm run dev:http

# Test with MCP Inspector
npm run inspect

# Run tests
npm test
```

## Links

[![MCP Endpoint](https://img.shields.io/badge/MCP_Endpoint-agents.debridge.com%2Fmcp-7C3AED?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3TDEyIDJ6Ii8+PC9zdmc+&logoColor=white)](https://agents.debridge.com/mcp)
[![agents.debridge.com](https://img.shields.io/badge/Site-agents.debridge.com-0F172A?style=for-the-badge&logo=google-chrome&logoColor=white)](https://agents.debridge.com)
[![llms.txt](https://img.shields.io/badge/llms.txt-Overview-4B5563?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTE0IDJIOEM2LjkgMiA2IDIuOSA2IDRWMTBJNI45IDEwLjEgNy44IDExIDkgMTFIMTVDMTYuMiAxMSAxNy4xIDEwLjEgMTcgOVY0QzE3IDIuOSAxNi4xIDIgMTUgMkgxNFYyWk05IDRIMTVWOUg5VjRaTTQgMTVDMi45IDE1IDIgMTUuOSAyIDE3VjIwQzIgMjEuMSAyLjkgMjIgNCAyMkgxMEMxMS4xIDIyIDEyIDIxLjEgMTIgMjBWMTdDMTIgMTUuOSAxMS4xIDE1IDEwIDE1SDRaTTQgMTdIMTBWMjBINFYxN1pNMTQgMTVDMTIuOSAxNSAxMiAxNS45IDEyIDE3VjIwQzEyIDIxLjEgMTIuOSAyMiAxNCAyMkgyMEMyMS4xIDIyIDIyIDIxLjEgMjIgMjBWMTdDMjIgMTUuOSAyMS4xIDE1IDIwIDE1SDE0Wk0xNCAxN0gyMFYyMEgxNFYxN1oiLz48L3N2Zz4=&logoColor=white)](https://agents.debridge.com/llms.txt)
[![Skills](https://img.shields.io/badge/Skills-debridge--skills-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/debridge-finance/debridge-skills)
[![npm](https://img.shields.io/npm/v/@debridge-finance/debridge-mcp?style=for-the-badge&logo=npm&logoColor=white&label=npm)](https://www.npmjs.com/package/@debridge-finance/debridge-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-8A2BE2?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3TDEyIDJ6Ii8+PC9zdmc+)](https://registry.modelcontextprotocol.io/?q=io.github.debridge-finance%2Fdebridge-mcp)

## License

[MIT](LICENSE), Copyright 2026 deBridge
