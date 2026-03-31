import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

import type { ForgotPasswordInput, ResetPasswordInput } from "../../shared/contracts";
import { forgotPasswordSchema, resetPasswordSchema } from "../../shared/contracts";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

interface PasswordResetDialogProps {
  open: boolean;
  onClose: () => void;
  defaultIdentifier?: string;
}

export function PasswordResetDialog({
  open,
  onClose,
  defaultIdentifier = "",
}: PasswordResetDialogProps) {
  const { requestPasswordReset, resetPassword } = useAuth();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [requestMessage, setRequestMessage] = useState<string | null>(null);

  const requestForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      identifier: defaultIdentifier,
    },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      identifier: defaultIdentifier,
      otp: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setStep("request");
      setRequestMessage(null);
      requestForm.reset({ identifier: defaultIdentifier });
      resetForm.reset({
        identifier: defaultIdentifier,
        otp: "",
        newPassword: "",
      });
    }
  }, [defaultIdentifier, open, requestForm, resetForm]);

  async function handleRequest(values: ForgotPasswordInput) {
    try {
      const result = await requestPasswordReset(values);
      setRequestMessage(result.message);
      setStep("reset");
      resetForm.reset({
        identifier: values.identifier,
        otp: "",
        newPassword: "",
      });

      if (result.otpPreview && result.resetTokenPreview) {
        toast.success(`Demo OTP: ${result.otpPreview} | Reset token ready`);
      } else if (result.otpPreview) {
        toast.success(`Demo OTP: ${result.otpPreview}`);
      } else {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to prepare password reset."));
    }
  }

  async function handleReset(values: ResetPasswordInput) {
    try {
      await resetPassword(values);
      toast.success("Password updated successfully.");
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to reset the password."));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{step === "request" ? "Forgot password" : "Reset password"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={0.5}>
          {requestMessage ? <Alert severity="info">{requestMessage}</Alert> : null}

          {step === "request" ? (
            <Stack
              component="form"
              spacing={2}
              onSubmit={requestForm.handleSubmit((values) => void handleRequest(values))}
            >
              <TextField
                label="Dealer code, username, or email"
                autoFocus
                {...requestForm.register("identifier")}
                error={Boolean(requestForm.formState.errors.identifier)}
                helperText={requestForm.formState.errors.identifier?.message}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={requestForm.formState.isSubmitting}
              >
                Send OTP
              </Button>
            </Stack>
          ) : (
            <Stack
              component="form"
              spacing={2}
              onSubmit={resetForm.handleSubmit((values) => void handleReset(values))}
            >
              <TextField
                label="Identifier"
                {...resetForm.register("identifier")}
                error={Boolean(resetForm.formState.errors.identifier)}
                helperText={resetForm.formState.errors.identifier?.message}
              />
              <TextField
                label="OTP"
                inputMode="numeric"
                {...resetForm.register("otp")}
                error={Boolean(resetForm.formState.errors.otp)}
                helperText={resetForm.formState.errors.otp?.message}
              />
              <TextField
                label="New password"
                type="password"
                {...resetForm.register("newPassword")}
                error={Boolean(resetForm.formState.errors.newPassword)}
                helperText={resetForm.formState.errors.newPassword?.message}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={resetForm.formState.isSubmitting}
              >
                Update password
              </Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {step === "reset" ? (
          <Button onClick={() => setStep("request")}>Back</Button>
        ) : null}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
