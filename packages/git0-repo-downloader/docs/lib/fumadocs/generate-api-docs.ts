/**
 * @file generate-api-docs.ts
 * @description Script to generate API documentation files from an OpenAPI specification.
 */
import { generateFiles } from 'fumadocs-openapi';
import { createOpenAPI } from 'fumadocs-openapi/server';
import { rimraf } from 'rimraf';
import { existsSync } from 'fs';
import { docsConfig } from './customize-docs'

const out = 'content/docs/(api)';


async function generate(openapiPath: string | undefined) {
  // Validate file exists
  if (!openapiPath || !existsSync(openapiPath)) {
    console.error(`Error: OpenAPI file not found${openapiPath ? ` at "${openapiPath}"` : ''}`);
    process.exit(1);
  }

  // Use relative path for glob resolution
  console.log(`Generating API docs from: ${openapiPath}`);

  // clean generated files
  await rimraf(out, {
    filter(v) {
      return !v.endsWith('index.mdx') && !v.endsWith('meta.json');
    },
  });

  // Create OpenAPI instance (required for fumadocs-openapi v10+)
  const openapi = createOpenAPI({
    input: [openapiPath],
  });

  await generateFiles({
    input: openapi,
    output: out,
    includeDescription: true,

    // Or disable comments
    addGeneratedComment: false,
    frontmatter: (title, description) => ({
      description: ''
    }),
    // index: {
    //   // for generating `href`
    //   url: {
    //     baseUrl: '/docs/api',
    //     contentDir: './content/docs/api',
    //   },
    //   items: [
    //     {
    //       path: 'api.mdx',
    //       description: 'All available pages',
    //     },
    //   ],
    // },

  });

  console.log(`API documentation generated successfully in: ${out}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

const openapiPath = args[0] || docsConfig.apiDocsPath;
if (!openapiPath) {
    console.error('Error: OpenAPI file path not provided');
    process.exit(1);
}
void generate(openapiPath);
