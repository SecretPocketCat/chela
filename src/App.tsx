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
  useToast,
} from "@chakra-ui/react";
import { MdClose, MdMinimize, MdFolder } from "react-icons/md";
import { CullScreen } from "./components/CullScreen";
import { useAtomValue, useAtom } from "jotai";
import { titleAtom } from "./store/navStore";
import { configAtom } from "./store/configStore";
import { IconType } from "react-icons";

const colors: ChakraTheme["colors"] = {
  transparent: "transparent",
  light: "#e5e7eb",
  dark: "#222",
  border: "#333",
  "border-dark": "#111",
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
  const toast = useToast();

  // nav
  const title = useAtomValue(titleAtom);

  // open dir
  async function openDir() {
    try {
      setImageGroups(await invoke<GroupedImages>("open_dir"));
    } catch (error) {
      if (typeof error === "string") {
        toast({
          status: "error",
          title: "Could not cull directory",
          description: error,
          isClosable: true,
          position: "bottom-right",
        });
      }
    }
  }

  // culling done
  function onCullFinished() {
    setImageGroups(undefined);
    toast({
      status: "success",
      title: "Done",
      isClosable: true,
      position: "bottom-right",
    });
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
            icon={<Icon as={MdFolder as IconType} boxSize="20px" marginBottom={1} />}
            marginLeft={1}
            onClick={openDir}
          />
        </div>
        <div>{title}</div>
        <div>
          <IconButton
            size="x"
            variant="ghost"
            colorScheme="gray"
            aria-label="Minimize"
            icon={<Icon as={MdMinimize as IconType} boxSize="20px" marginBottom={1} />}
            marginRight={1}
            onClick={() => appWindow.minimize()}
          />

          <IconButton
            size="x"
            variant="ghost"
            colorScheme="gray"
            aria-label="Close"
            icon={<Icon as={MdClose as IconType} boxSize="20px" />}
            marginRight={1.5}
            onClick={() => appWindow.close()}
          />
        </div>
      </nav>

      {appConf ? (
        <div className="chela--app tw-flex tw-overflow-hidden tw-h-full">
          {groupedImages?.groups.length ? (
            <CullScreen groupedImages={groupedImages} onCullFinished={onCullFinished} />
          ) : (
            <div className="tw-flex tw-h-full tw-w-full tw-items-center tw-justify-center">
              <Button
                backgroundColor="primary"
                padding={7}
                size="lg"
                leftIcon={
                  <Icon as={MdFolder as IconType} boxSize="30px" marginRight={2} />
                }
                onClick={openDir}
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
