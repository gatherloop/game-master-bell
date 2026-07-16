/** Thrown when the call API request fails (offline, non-2xx, etc). Per FR-W6. */
export class CallGameMasterError extends Error {}

/** POSTs a bell tap to the call API. Throws {@link CallGameMasterError} on failure. */
export async function callGameMaster(tableCode: string): Promise<void> {
  const url = import.meta.env.VITE_CALL_API_URL;

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
    throw new CallGameMasterError(`Call API responded with ${response.status}`);
  }
}
