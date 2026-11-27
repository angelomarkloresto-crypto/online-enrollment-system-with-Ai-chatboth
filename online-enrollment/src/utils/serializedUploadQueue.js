export function createSerializedUploadQueue() {
  let queue = Promise.resolve();

  return (task) => {
    const request = queue.then(task);
    queue = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  };
}
