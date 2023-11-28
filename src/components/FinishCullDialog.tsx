import { invoke } from "@tauri-apps/api";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Alert,
  AlertIcon,
  Spinner,
  useDisclosure,
  useToast,
  Input,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
} from "@chakra-ui/react";
import { ImageStateMap } from "./CullScreen";
import { useLoadingStateFn } from "../utils/loading";
import { useEffect, useState, FormEvent, useMemo } from "react";

export function FinishCullDialog({
  stateCounts,
  cullDirName,
  showDialog,
  onCloseDialog,
  onCullFinished,
}: {
  stateCounts: ImageStateMap;
  cullDirName: string;
  showDialog: boolean;
  onCloseDialog: () => void;
  onCullFinished: () => void;
}) {
  const toast = useToast();
  const { loading, fn: finishCulling } = useLoadingStateFn(async () => {
    if (!editDirValid) {
      return;
    }

    try {
      await invoke("finish_culling", {
        editDir,
      });
      closeDialog();
      onCullFinished();
    } catch (err) {
      if (typeof err === "string") {
        toast({
          status: "error",
          title: "Could not cull directory",
          description: err,
          isClosable: true,
          position: "bottom-right",
        });
      }
    }
  });

  const { onClose: closeDialog } = useDisclosure();

  // form
  const [editDir, setEditDir] = useState(cullDirName);
  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
  }

  useEffect(() => {
    setEditDir(cullDirName);
  }, [cullDirName]);

  const editDirValid = useMemo(() => editDir.trim().length > 0, [editDir]);

  return (
    <Modal
      isOpen={showDialog}
      onClose={() => {}}
      motionPreset="slideInBottom"
      isCentered
      closeOnOverlayClick={false}
      onEsc={onCloseDialog}
    >
      <ModalOverlay />
      <ModalContent className="tw-p-2 tw-pb-6">
        <form onSubmit={onSubmit}>
          <ModalHeader>Slicing & dicing</ModalHeader>

          <ModalBody className="tw-flex tw-items-center tw-justify-center tw-flex-col tw-gap-5">
            <Alert status="info" className="tw-rounded-md">
              <AlertIcon />
              {`Keeping ${stateCounts.get("selected") ?? 0} and removing ${
                stateCounts.get("rejected") ?? 0
              } images`}
            </Alert>

            {/* todo: transition */}
            {loading ? (
              <Spinner
                color="primary"
                size="xl"
                thickness="20px"
                height={100}
                width={100}
              />
            ) : (
              <FormControl isRequired isInvalid={!editDirValid}>
                <FormLabel>Edit directory</FormLabel>
                <Input
                  value={editDir}
                  onChange={(ev) => setEditDir(ev.currentTarget.value)}
                  variant="filled"
                  placeholder="Edit directory"
                  autoFocus
                />
                <FormErrorMessage>Invalid value</FormErrorMessage>
              </FormControl>
            )}
          </ModalBody>

          <ModalFooter>
            {loading ? undefined : (
              <Button colorScheme="blue" onClick={finishCulling} type="submit">
                Finish
              </Button>
            )}
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
