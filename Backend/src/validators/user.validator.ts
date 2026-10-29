
import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Name must be at least 2 characters"
        )
        .max(
          100,
          "Name must not exceed 100 characters"
        )
        .optional(),

      avatar: z
        .string()
        .trim()
        .url("Avatar must be a valid URL")
        .refine(
          (value) => {
            try {
              const url = new URL(value);

              return (
                url.protocol === "https:" ||
                url.protocol === "http:"
              );
            } catch {
              return false;
            }
          },
          "Avatar URL must use HTTP or HTTPS"
        )
        .optional(),
    })
    .strict()
    .refine(
      (data) =>
        data.name !== undefined ||
        data.avatar !== undefined,
      {
        message:
          "At least one profile field is required",
      }
    ),
});
