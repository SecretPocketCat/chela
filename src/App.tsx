import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { AppConfig } from "../src-tauri/bindings/AppConfig";
import { GroupedImages } from "../src-tauri/bindings/GroupedImages";
import {
  ChakraProvider,
  Button,
  Icon,
  IconButton,
  extendTheme,
  ChakraTheme,
} from "@chakra-ui/react";
import { MdClose, MdMinimize, MdFolder } from "react-icons/md";
import { CullScreen } from "./components/CullScreen";
import { useAtomValue, useAtom } from "jotai";
import { titleAtom } from "./store/navStore";
import { configAtom } from "./store/configStore";

const colors: ChakraTheme["colors"] = {
  transparent: "transparent",
  light: "#e5e7eb",
  dark: "#222",
  border: "#333",
  "border-dark": "#252525",
  primary: "#075985",
  negative: "#f87171",
  positive: "#34d399",
};

const theme = extendTheme({
  colors,
  config: {
    initialColorMode: "dark",
  },
} satisfies Partial<ChakraTheme>);

export function App() {
  const [groupedImages, setImageGroups] = useState<GroupedImages>();

  // nav
  const title = useAtomValue(titleAtom);

  // cull
  async function cullDir() {
    setImageGroups(await invoke<GroupedImages>("cull_dir"));
  }

  // conf
  const [appConf, setAppConf] = useAtom(configAtom);
  useAsyncEffect(async () => {
    setAppConf(await invoke<AppConfig>("get_config"));
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <nav className="tw-flex tw-justify-between tw-items-center tw-h-6 tw-bg-border tw-w-screen">
        <div>
          <IconButton
            size="x"
            variant="ghost"
            colorScheme="blue"
            aria-label="Minimize"
            icon={<Icon as={MdFolder} boxSize="20px" marginBottom={1} />}
            marginLeft={1}
            onClick={cullDir}
          />
        </div>
        <div>{title}</div>
        <div>
          <IconButton
            size="x"
            variant="ghost"
            colorScheme="gray"
            aria-label="Minimize"
            icon={<Icon as={MdMinimize} boxSize="20px" marginBottom={1} />}
            marginRight={1}
            onClick={() => appWindow.minimize()}
          />

          <IconButton
            size="x"
            variant="ghost"
            colorScheme="gray"
            aria-label="Close"
            icon={<Icon as={MdClose} boxSize="20px" />}
            marginRight={1.5}
            onClick={() => appWindow.close()}
          />
        </div>
      </nav>

      {appConf ? (
        <div className="chela--app tw-flex tw-overflow-hidden tw-h-full">
          {groupedImages?.groups.length ? (
            <CullScreen groupedImages={groupedImages} />
          ) : (
            <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center">
              <Button
                backgroundColor="primary"
                padding={7}
                size="lg"
                leftIcon={<Icon as={MdFolder} boxSize="30px" marginRight={2} />}
                onClick={cullDir}
              >
                Cull directory
              </Button>
            </div>
          )}
        </div>
      ) : undefined}
    </ChakraProvider>
  );
}
