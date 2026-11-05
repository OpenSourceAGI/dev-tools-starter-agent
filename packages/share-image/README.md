# share-image

Upload one or many images to Imgur by URL, file or folder and get the Imgur link for each one. No Imgur account or setup needed, and no dependencies. Requires Node 18 or later.

## Install

Run it without installing:

```sh
npx share-image https://compote.slate.com/images/b136d0ff-db57-4a8b-9a3b-b280e373f27f.jpeg?crop=1560%2C1040%2Cx0%2Cy0&s=image-1170
```

Or install the command globally:

```sh
npm install -g share-image
```

## Usage

Pass one or more URLs, files or folders, or a JSON array of them:

```sh
share-image https://example.com/a.png
share-image https://example.com/a.png https://example.com/b.jpg
share-image '["https://example.com/a.png", "https://example.com/b.jpg"]'
share-image ./logo.png
share-image ./photos
```

`http`, `https` and `data:` (base64) image URLs are accepted.

### Uploading a folder

A folder is searched for images, including in all its subfolders, and each result shows the file's path:

```
photos/a.png	https://i.imgur.com/xxxxxxx.png
photos/trips/b.jpg	https://i.imgur.com/yyyyyyy.jpg
```

- **Every image found is uploaded publicly, and this tool can't delete uploads.** Check what's in a folder before you point the tool at it.
- These file types are included: `apng`, `bmp`, `gif`, `heic`, `jpeg`, `jpg`, `png`, `svg`, `tif`, `tiff` and `webp`. Imgur may still reject some of them, which shows up as an error for that file.
- Hidden files and folders and symlinks are skipped.
- A folder with no images counts as a failed upload.

### Options

| Option | Description |
| --- | --- |
| `--json` | Print results as a JSON array |
| `-h`, `--help` | Show help |

### Environment variables

| Variable | Description |
| --- | --- |
| `IMGUR_CLIENT_ID` | Imgur API client ID to use instead of the built-in one |
| `IMGUR_CLIENT_SECRET` | Imgur API client secret to use instead of the built-in one |

## Output

Results are printed in the same order as the inputs. Each line is the input URL, a tab, then the Imgur link:

```
https://example.com/a.png	https://i.imgur.com/xxxxxxx.png
https://example.com/b.jpg	ERROR: Too many requests
```

With `--json`, each result has either an `imgur` or an `error` field:

```json
[
  { "input": "https://example.com/a.png", "imgur": "https://i.imgur.com/xxxxxxx.png" },
  { "input": "https://example.com/b.jpg", "error": "Too many requests" }
]
```

A failed upload doesn't stop the others.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | All images uploaded |
| `1` | At least one upload failed |
| `2` | Invalid arguments |

### Using the output in a script

Print only the Imgur links:

```sh
share-image https://example.com/a.png https://example.com/b.jpg | cut -f2
```

The same with `--json` and [jq](https://jqlang.github.io/jq/):

```sh
share-image --json https://example.com/a.png | jq -r '.[].imgur'
```

## Testing

Run the test suite. It mocks every request, so nothing is uploaded and no network is needed:

```sh
npm test
```

Upload a sample image with your local copy of the CLI, or pass your own URLs, files or folders:

```sh
bun demo
npm run demo -- ./logo.png
```

This prints the name of each input file and its Imgur link, and exits with `1` if an upload fails or the link doesn't look like an Imgur image link:

```
input file: logo.png
output url: https://i.imgur.com/xxxxxxx.png
```

This makes a real, public upload to Imgur, and it can't be deleted with this tool.

## How it works

Up to 4 images upload at a time. Imgur first tries to fetch each URL itself. If it can't, the image is downloaded on your machine and sent to Imgur directly, which helps with hosts that block Imgur. This retry is skipped on `401`, `403` and `429` responses, since sending the image again wouldn't help.

Each request times out after 60 seconds.

## Good to know

- **Uploads are anonymous.** Images aren't linked to an Imgur account, and login and albums aren't supported.
- **Anyone with the link can view an image.** Don't upload anything private.
- **You can't delete uploads with this tool.** It doesn't output the delete hash that Imgur returns.
- **The default client ID is shared.** All users of the built-in ID share its rate limit, so `429` errors can happen even at low volume. For regular use, [register your own client ID](https://api.imgur.com/oauth2/addclient) and set `IMGUR_CLIENT_ID`.
