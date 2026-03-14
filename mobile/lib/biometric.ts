"""Biometric authentication helper using Expo LocalAuthentication."""
import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: string[];
}

export class BiometricHelper {
  /**
   * Check if biometric authentication is available on device
   */
  static async checkCapabilities(): Promise<BiometricCapabilities> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes: supportedTypes.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return "fingerprint";
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return "face";
          case LocalAuthentication.AuthenticationType.IRIS:
            return "iris";
          default:
            return "unknown";
        }
      }),
    };
  }

  /**
   * Authenticate user with biometrics
   */
  static async authenticate(promptMessage: string = "Authenticate to continue"): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const capabilities = await this.checkCapabilities();

      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: capabilities.hasHardware
            ? "No biometric credentials enrolled"
            : "Biometric hardware not available",
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Authentication failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get biometric type name for display
   */
  static async getBiometricTypeName(): Promise<string> {
    const capabilities = await this.checkCapabilities();

    if (capabilities.supportedTypes.includes("face")) {
      return "Face ID";
    } else if (capabilities.supportedTypes.includes("fingerprint")) {
      return "Fingerprint";
    } else if (capabilities.supportedTypes.includes("iris")) {
      return "Iris";
    }

    return "Biometric";
  }
}
