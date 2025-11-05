/**
 * Handles POST requests to /api/export
 * This function takes task data from the request body, formats it into a text file,
 * and returns it for download.
 */
export async function onRequestPost({ request }) {
  try {
    // 1. Get the data from the request body
    const data = await request.json();

    // 2. Extract task data and date string
    const tasks = data.get("tasks", []);
    const dateString = data.get("date", new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

    // 3. Generate the text file content
    let content = `InkTodos - Tasks for ${dateString}\r\n`;
    content += "----------------------------------------\r\n\r\n";

    tasks.forEach(task => {
      const status = task.completed ? "[✓]" : "[ ]";
      const rolledOver = task.rolledOver ? "↻ " : "";
      const taskText = task.text || "";
      content += `${status} ${rolledOver}${taskText}\r\n`;
    });

    content += "\r\n----------------------------------------\r\n";
    content += "Exported from InkTodos\r\n";

    // 4. Generate a filename with the current date
    const dateForFilename = new Date().toISOString().split('T')[0];
    const filename = `InkTodos-${dateForFilename}.txt`;

    // 5. Return the response as a downloadable file
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename=${filename}`
      }
    });

  } catch (error) {
    // If something goes wrong, return an error response
    return new Response(`Error exporting tasks: ${error.message}`, {
      status: 500
    });
  }
}
