/**
 * API for handling tasks stored in Cloudflare KV.
 * Supports GET to fetch tasks and POST to save tasks.
 * Also handles rolling over uncompleted tasks from the previous day.
 */

// Helper function to get a consistent date key (YYYY-MM-DD format)
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Handles GET requests to /api/tasks
 * Fetches tasks for the current day. If no tasks exist for today,
 * it automatically rolls over uncompleted tasks from yesterday.
 */
export async function onRequestGet({ env }) {
  try {
    const today = new Date();
    const todayKey = getDateKey(today);

    // Try to get today's tasks
    let todaysTasks = await env.TODOS_KV.get(todayKey, { type: 'json' });

    // If today's tasks don't exist, check for yesterday's tasks to roll over
    if (todaysTasks === null) {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayKey = getDateKey(yesterday);

      const yesterdayTasks = await env.TODOS_KV.get(yesterdayKey, { type: 'json' });

      if (yesterdayTasks && Array.isArray(yesterdayTasks)) {
        const uncompletedTasks = yesterdayTasks.filter(task => !task.completed);
        
        // Mark tasks as rolled over
        todaysTasks = uncompletedTasks.map(task => ({
          ...task,
          rolledOver: true,
        }));

        // Save the new rolled-over tasks for today
        await env.TODOS_KV.put(todayKey, JSON.stringify(todaysTasks));
      } else {
        // No tasks yesterday, so today's list is empty
        todaysTasks = [];
      }
    }

    return new Response(JSON.stringify(todaysTasks), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(`Error fetching tasks: ${error.message}`, { status: 500 });
  }
}

/**
 * Handles POST requests to /api/tasks
 * Saves the provided list of tasks for the current day.
 */
export async function onRequestPost({ request, env }) {
  try {
    const tasks = await request.json();
    const todayKey = getDateKey(new Date());

    if (!Array.isArray(tasks)) {
      return new Response('Invalid payload: body must be a JSON array of tasks.', { status: 400 });
    }

    // Save the tasks to the KV store
    await env.TODOS_KV.put(todayKey, JSON.stringify(tasks));

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(`Error saving tasks: ${error.message}`, { status: 500 });
  }
}
