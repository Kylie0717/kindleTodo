export async function onRequestGet({ request }) {
  try {
    const clientIp = request.headers.get('CF-Connecting-IP') || '';
    const res = await fetch('https://wttr.in/?format=j1', {
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
    const city = nearest ? (nearest.areaName[0].value || '') : '';

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
