import { useState } from "react";
import { useAsyncEffect } from "use-async-effect";
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";
import { AppConfig } from "../src-tauri/bindings/AppConfig";
import { ImageDir } from "../src-tauri/bindings/ImageDir";
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
import { IconType } from "react-icons";
import { useErrorToastHandler, useSuccessToast } from "./hooks/toast";
import { Store } from "tauri-plugin-store-api";

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

const settingsStore = new Store(".settings.dat");
const settingsKey = "app-settings";
interface AppSettings {
  imageDirPath: string | undefined;
}

export function App() {
  const [imageDir, setImageDir] = useState<ImageDir>();
  const successToast = useSuccessToast();
  const errorToastHandler = useErrorToastHandler();

  // nav
  const title = useAtomValue(titleAtom);

  async function getAppSettings() {
    return settingsStore.get<AppSettings>(settingsKey);
  }

  async function storeAppSettings(settings: AppSettings) {
    await settingsStore.set(settingsKey, settings);
    await settingsStore.save();
  }

  // open dir
  async function openDir() {
    try {
      const imgDir = await invoke<ImageDir>("open_dir_picker");
      setImageDir(imgDir);
      await storeAppSettings({
        imageDirPath: imgDir?.path,
      });
    } catch (error) {
      errorToastHandler(error, "Could not cull directory");
    }
  }

  // culling done
  async function onCullFinished() {
    setImageDir(undefined);
    await storeAppSettings({
      imageDirPath: undefined,
    });
    successToast("Done");
  }

  // conf
  const [appConf, setAppConf] = useAtom(configAtom);
  useAsyncEffect(async () => {
    setAppConf(await invoke<AppConfig>("get_config"));
    const settings = await getAppSettings();
    if (settings?.imageDirPath) {
      try {
        setImageDir(
          await invoke<ImageDir>("open_dir", {
            path: settings.imageDirPath,
          }),
        );
      } catch (e) {
        errorToastHandler(e, "Failed to open stored dir");
      }
    }
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
          {imageDir?.images.length ? (
            <CullScreen imageDir={imageDir} onCullFinished={onCullFinished} />
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
