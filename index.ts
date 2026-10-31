import { Plugin } from "@opencode/plugin"
import { GoUsage } from "./rpc.js"

const USAGE_URL = "https://opencode.ai/zen/go/v1/usage"

function extractKey(cred: unknown): string | null {
  if (!cred) return null
  if (typeof cred === "string") return cred.length > 0 ? cred : null
  if (typeof cred === "object") {
    const c = cred as Record<string, unknown>
    for (const k of ["key", "value", "token", "apiKey"]) {
      const v = c[k]
      if (typeof v === "string" && v.length > 0) return v
    }
  }
  return null
}

export default Plugin.define({
  id: "go-usage",
  async setup(ctx) {
    const registration = await ctx.rpc.register(GoUsage, {
      getUsage: async (_input, context) => {
        const connection = await ctx.integration.connection.active("opencode-go")
        if (!connection) return context.error("no_auth", "OpenCode Go not connected", {})
        const cred = await ctx.integration.connection.resolve(connection)
        const apiKey = extractKey(cred)
        if (!apiKey) return context.error("no_auth", "OpenCode Go credential empty", {})
        const res = await fetch(USAGE_URL, {
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
          signal: context.signal,
        })
        if (!res.ok)
          return context.error("fetch_failed", `usage endpoint returned ${res.status}`, {
            message: `usage endpoint returned ${res.status}`,
            status: res.status,
          })
        const data = (await res.json()) as { usage?: unknown }
        return { usage: data?.usage ?? null }
      },
    })

    return () => {
      void registration.dispose()
    }
  },
})
