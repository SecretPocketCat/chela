import { useToast } from "@chakra-ui/react";

export function useErrorToastHandler() {
  const errorToast = useErrorToast();
  return (error: unknown, errorTitle: string) => {
    if (typeof error === "string") {
      errorToast(errorTitle, error);
    }
  };
}

export function useErrorToast() {
  const toast = useToast();
  return (title: string, description: string) => {
    toast({
      status: "error",
      title,
      description,
      isClosable: true,
      position: "bottom-right",
    });
  };
}

export function useSuccessToast() {
  const toast = useToast();
  return (title: string, description?: string) =>
    toast({
      status: "success",
      title,
      description,
      isClosable: true,
      position: "bottom-right",
    });
}
