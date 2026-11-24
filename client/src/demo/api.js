export async function request(path, method = 'GET', body) {
  const response = await fetch('/api' + path, {
    method, credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type':'application/json' },
    ...(body === undefined ? {} : {body:JSON.stringify(body)})
  });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The event service is unavailable.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Please try again.');
  return data;
}
export const amount = n => '৳' + Number(n).toLocaleString('en-GB');
export const dateLabel = d => new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Dhaka'});
