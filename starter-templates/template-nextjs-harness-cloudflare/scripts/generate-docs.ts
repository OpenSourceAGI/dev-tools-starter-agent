import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

async function generateDocs() {
  console.log("Generating fumadocs MDX files...")
  try {
    const { stdout, stderr } = await execAsync("fumadocs-mdx")
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    console.log("✓ Fumadocs MDX files generated successfully")
  } catch (error) {
    console.error("Error generating fumadocs:", error)
    process.exit(1)
  }
}

generateDocs()
