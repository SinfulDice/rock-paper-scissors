// R31: saves text as a file on the user's computer. Nothing is uploaded: the browser creates
// the file itself from memory (a "Blob") and starts a normal download.
export function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click() // a fake click on an invisible link starts the download
  URL.revokeObjectURL(url) // free the memory
}
