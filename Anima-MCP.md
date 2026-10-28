# Anima live MCP

Drive a **running** Anima editor from Cursor (or any MCP client) over a local socket.

## Architecture

1. **`anima-app`** listens on `127.0.0.1:7843` (override with `ANIMA_MCP_PORT` or `--mcp-port`). Disable with `--no-mcp`.
2. On launch it writes `~/.anima/mcp-port` and `~/.anima/mcp-token`.
3. **`anima-mcp`** is a stdio MCP server. Cursor starts it; each tool call proxies JSON to the editor. Commands run on the UI thread.

## Cursor setup

Add to your MCP config (e.g. `.cursor/mcp.json` or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "anima": {
      "command": "cargo",
      "args": ["run", "-p", "anima-mcp", "--quiet"],
      "cwd": "/absolute/path/to/experiment-rust",
      "env": {
        "ANIMA_MCP_PORT": "7843"
      }
    }
  }
}
```

Or point `command` at a built binary:

```bash
cargo build -p anima-mcp --release
# then: "command": ".../target/release/anima-mcp"
```

## Usage

1. Start Anima: `cargo run -p anima-app`
2. Ensure the MCP server is enabled in Cursor
3. Ask the agent to use Anima tools (`get_status`, `create_rectangle`, `create_symbol`, timeline tools, …)

If the editor is not running, tools return a clear connection error.

## Safety

- Bind is **localhost only**
- Session token from `~/.anima/mcp-token` (or `ANIMA_MCP_TOKEN`) must match
- Commands are rejected while a modal dialog is open
- Publish is explicit (`publish_flashtube` / `publish_pngs`) — never a side effect of save

## Resources

| URI | Content |
|-----|---------|
| `anima://status` | Short status JSON |
| `anima://document` | Status + library + timeline |
| `anima://selection` | Current selection |

## Useful tools

- Session: `ping`, `get_status`, `new_document`, `open_document`, `save_document`, `save_document_as`
- Draw: `create_rectangle`, `create_oval`, `set_fill`, `bucket_fill_at`
- Selection: `get_selection`, `select_shapes`, `select_instances`, `nudge_selection`, `delete_selection`
- Library: `list_library`, `create_symbol`, `place_instance`, `enter_symbol_edit`, `convert_selection_to_symbol`
- Timeline: `list_timeline`, `add_layer`, `insert_keyframe`, `create_classic_tween`, `set_frame_label`
