(addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
}))

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  return new Response('Hello World!', {
    headers: { 'content-type': 'text/plain' }
  })
}