import {
  DownloadAppButton,
  getOS,
  buildStoreUrl,
  buildDeepLink,
  OS,
} from "../src";

const IOS_APP_ID = "6474268307";
const ANDROID_APP_ID = "com.example.app";
const EXTENSION_ID = "noecbaibfhbmpapofcdkgchfifmoinfj";
const MACOS_APP_ID = "6474268307";
const WINDOWS_APP_ID = "9NBLGGH4NNS1";
const SNAP_ID = "example-app";

const currentOS = getOS();

const OS_LABELS: Record<OS, string> = {
  [OS.iOS]: "iOS",
  [OS.Android]: "Android",
  [OS.macOS]: "macOS",
  [OS.Windows]: "Windows",
  [OS.Linux]: "Linux",
  [OS.Unknown]: "Unknown",
};

function Section({
  title,
  dark,
  children,
}: {
  title: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-12 px-6 ${dark ? "bg-gray-900" : "bg-gray-950"}`}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-sm font-mono text-gray-400 uppercase tracking-widest mb-6">
          {title}
        </h2>
        <div className="flex flex-wrap gap-6 items-center">{children}</div>
      </div>
    </section>
  );
}

function UrlRow({
  platform,
  appId,
}: {
  platform: Parameters<typeof buildStoreUrl>[0];
  appId: string;
}) {
  const web = buildStoreUrl(platform, appId);
  const deep = buildDeepLink(platform, appId);
  return (
    <div className="grid grid-cols-[100px_1fr_1fr] gap-x-4 gap-y-0.5 items-start text-xs">
      <span className="text-gray-500 pt-0.5">{platform}</span>
      <code className="text-green-400 break-all">{web ?? "—"}</code>
      <code className="text-yellow-400 break-all">{deep ?? "—"}</code>
    </div>
  );
}

export function App() {
  return (
    <div className="min-h-screen font-sans">
      <header className="py-16 px-6 text-center border-b border-gray-800">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          react-app-store-buttons
        </h1>
        <p className="text-gray-400 text-lg mb-4">
          Platform download badges for React
        </p>
        <span className="inline-flex items-center gap-2 bg-gray-800 text-yellow-400 text-sm font-mono px-3 py-1 rounded-full border border-yellow-400/30">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Detected OS: {OS_LABELS[currentOS]}
        </span>
      </header>

      <Section title="autoHighlight — golden glow on your platform" dark>
        <DownloadAppButton platform="ios" appId={IOS_APP_ID} autoHighlight />
        <DownloadAppButton platform="android" appId={ANDROID_APP_ID} autoHighlight />
        <DownloadAppButton platform="chrome-extension" appId={EXTENSION_ID} autoHighlight />
        <DownloadAppButton platform="macos" appId={MACOS_APP_ID} autoHighlight />
        <DownloadAppButton platform="windows" appId={WINDOWS_APP_ID} autoHighlight />
        <DownloadAppButton platform="linux" href="https://example.com/linux" autoHighlight />
        <DownloadAppButton platform="linux-snap" appId={SNAP_ID} autoHighlight />
        <p className="text-xs text-gray-500 w-full">
          The button matching your OS receives the golden ring glow and uses a native deep link.
        </p>
      </Section>

      <Section title="highlight — manual override">
        <DownloadAppButton platform="ios" appId={IOS_APP_ID} highlight />
        <DownloadAppButton platform="android" appId={ANDROID_APP_ID} />
        <DownloadAppButton platform="windows" appId={WINDOWS_APP_ID} />
        <p className="text-xs text-gray-500 w-full">
          Pass <code className="text-yellow-400">highlight</code> to force the glow regardless of OS.
        </p>
      </Section>

      <Section title="resolved URLs — web vs native deep link">
        <div className="flex flex-col gap-2 w-full font-mono">
          <div className="grid grid-cols-[100px_1fr_1fr] gap-x-4 text-xs text-gray-600 mb-1">
            <span>platform</span>
            <span className="text-green-700">web URL</span>
            <span className="text-yellow-700">deep link (native)</span>
          </div>
          <UrlRow platform="ios" appId={IOS_APP_ID} />
          <UrlRow platform="android" appId={ANDROID_APP_ID} />
          <UrlRow platform="chrome-extension" appId={EXTENSION_ID} />
          <UrlRow platform="macos" appId={MACOS_APP_ID} />
          <UrlRow platform="windows" appId={WINDOWS_APP_ID} />
          <UrlRow platform="linux-snap" appId={SNAP_ID} />
          <UrlRow platform="linux" appId="—" />
        </div>
      </Section>

      <Section title="custom height (height=72)" dark>
        <DownloadAppButton platform="ios" appId={IOS_APP_ID} height={72} autoHighlight />
        <DownloadAppButton platform="android" appId={ANDROID_APP_ID} height={72} autoHighlight />
      </Section>

      <footer className="py-8 text-center text-gray-600 text-sm border-t border-gray-800">
        react-app-store-buttons · MIT License
      </footer>
    </div>
  );
}
