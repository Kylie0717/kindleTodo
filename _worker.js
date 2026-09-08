/**
 * InkTodos - Kindle Todo App Worker
 * Handles /api/tasks, /api/weather, /api/export routes
 * Serves static assets for everything else
 */

// ===== Helper: get date key in YYYY-MM-DD format =====
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===== /api/tasks =====
async function handleTasks(request, env) {
  if (request.method === 'GET') {
    try {
      const today = new Date();
      const todayKey = getDateKey(today);

      let todaysTasks = await env.TODOS_KV.get(todayKey, { type: 'json' });

      if (todaysTasks === null) {
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const yesterdayKey = getDateKey(yesterday);

        const yesterdayTasks = await env.TODOS_KV.get(yesterdayKey, { type: 'json' });

        if (yesterdayTasks && Array.isArray(yesterdayTasks)) {
          const uncompletedTasks = yesterdayTasks.filter(task => !task.completed);
          todaysTasks = uncompletedTasks.map(task => ({
            ...task,
            rolledOver: true,
          }));
          await env.TODOS_KV.put(todayKey, JSON.stringify(todaysTasks));
        } else {
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

  if (request.method === 'POST') {
    try {
      const tasks = await request.json();
      const todayKey = getDateKey(new Date());

      if (!Array.isArray(tasks)) {
        return new Response('Invalid payload: body must be a JSON array of tasks.', { status: 400 });
      }

      await env.TODOS_KV.put(todayKey, JSON.stringify(tasks));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(`Error saving tasks: ${error.message}`, { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

// ===== /api/weather =====
async function handleWeather(request) {
  try {
    const url = new URL(request.url);
    const customCity = url.searchParams.get('city') || '';
    const clientIp = request.headers.get('CF-Connecting-IP') || '';

    const wttrUrl = customCity
      ? `https://wttr.in/${encodeURIComponent(customCity)}?format=j1`
      : 'https://wttr.in/?format=j1';

    const res = await fetch(wttrUrl, {
      headers: { 'X-Forwarded-For': clientIp, 'User-Agent': 'curl/7.68.0' }
    });
    const data = await res.json();
    const c = data.current_condition[0];
    const descRaw = c.weatherDesc[0].value.toLowerCase();

    let icon = '☁';
    if (descRaw.includes('sunny') || descRaw.includes('clear')) icon = '☀';
    else if (descRaw.includes('partly')) icon = '⛅';
    else if (descRaw.includes('rain') || descRaw.includes('drizzle')) icon = '🌧';
    else if (descRaw.includes('snow')) icon = '❄';
    else if (descRaw.includes('thunder') || descRaw.includes('storm')) icon = '⛈';
    else if (descRaw.includes('fog') || descRaw.includes('mist')) icon = '🌫';
    else if (descRaw.includes('overcast')) icon = '☁';

    const nearest = data.nearest_area && data.nearest_area[0];
    const city = customCity || (nearest ? (nearest.areaName[0].value || '') : '');

    return new Response(JSON.stringify({
      temp: c.temp_C,
      desc: c.weatherDesc[0].value,
      icon,
      humidity: c.humidity,
      city
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ===== /api/export =====
async function handleExport(request) {
  try {
    const data = await request.json();

    const tasks = data.tasks || [];
    const dateString = data.date || new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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

    const dateForFilename = new Date().toISOString().split('T')[0];
    const filename = `InkTodos-${dateForFilename}.txt`;

    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename=${filename}`
      }
    });
  } catch (error) {
    return new Response(`Error exporting tasks: ${error.message}`, { status: 500 });
  }
}

// ===== Main Worker Entry =====
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route API requests
    if (path === '/api/tasks') {
      return handleTasks(request, env);
    }

    if (path === '/api/weather') {
      return handleWeather(request);
    }

    if (path === '/api/export') {
      return handleExport(request);
    }

    // For all other requests, serve static assets
    return env.ASSETS.fetch(request);
  }
};
