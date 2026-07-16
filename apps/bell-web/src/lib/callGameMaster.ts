/** Thrown when the notify function call fails (offline, non-2xx, etc). Per FR-W6. */
export class CallGameMasterError extends Error {}

/** POSTs a bell tap to the notify function. Throws {@link CallGameMasterError} on failure. */
export async function callGameMaster(tableCode: string): Promise<void> {
  const url = import.meta.env.VITE_NOTIFY_FUNCTION_URL;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableCode }),
    });
  } catch (error) {
    throw new CallGameMasterError("Network request failed", { cause: error });
  }

  if (!response.ok) {
    throw new CallGameMasterError(`Notify function responded with ${response.status}`);
  }
}
