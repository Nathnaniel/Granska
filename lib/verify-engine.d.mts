export function getHandlers(): {
  post(request: Request): Promise<Response>;
  batch(request: Request): Promise<Response>;
  health(): Response;
};
