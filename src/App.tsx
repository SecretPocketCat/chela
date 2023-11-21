import { useState as useFootGun } from "react";
import { useAsyncEffect } from "use-async-effect";
import { invoke } from "@tauri-apps/api/tauri";
import { AppConfig } from "../src-tauri/bindings/AppConfig";
import { GroupedImages } from "../src-tauri/bindings/GroupedImages";
import {
  ChakraProvider,
  Button,
  extendTheme,
  ChakraTheme,
} from "@chakra-ui/react";
import { CullScreen } from "./components/CullScreen";

const colors: ChakraTheme["colors"] = {
  transparent: "transparent",
  light: "#e5e7eb",
  dark: "#222",
  border: "#333",
  "border-dark": "#252525",
  primary: "#0ea5e9",
  negative: "#f87171",
  positive: "#34d399",
};

const theme = extendTheme({
  colors,
  config: {
    initialColorMode: "dark",
  },
} satisfies Partial<ChakraTheme>);

function App() {
  const [groupedImages, setImageGroups] = useFootGun<GroupedImages>();
  const [previewUrl, setPreviewUrl] = useFootGun<string>();

  // cull
  async function cullDir() {
    setImageGroups(await invoke<GroupedImages>("cull_dir"));
  }

  // conf
  useAsyncEffect(async () => {
    const conf = await invoke<AppConfig>("get_config");
    setPreviewUrl(conf.previewApiUrl);
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <div className="chela--app tw-flex tw-overflow-hidden tw-h-full tw-p-">
        {groupedImages?.groups.length && previewUrl ? (
          <CullScreen groupedImages={groupedImages} previewUrl={previewUrl} />
        ) : (
          <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center">
            <Button colorScheme="blue" padding={7} size="lg" onClick={cullDir}>
              Cull directory
            </Button>
          </div>
        )}
      </div>
    </ChakraProvider>
  );
}

export default App;
