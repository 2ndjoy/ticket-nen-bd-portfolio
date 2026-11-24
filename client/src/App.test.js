import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('organiser login prefills the published demo credentials and opens the studio', async () => {
  const account = {role:'organiser', name:'Arif Hasan'};
  const responses = {
    '/api/session': { account:null },
    '/api/login': { account },
    '/api/dashboard': {events:[], bookings:[], tickets:0, value:0}
  };
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async url => ({
    ok:true, headers:{get:()=>'application/json'}, json:async ()=>responses[url]
  }));
  try {
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Organiser'}));
    expect(screen.getByLabelText('Email')).toHaveValue('organiser@demo.ticketnen.example');
    expect(screen.getByLabelText('Password')).toHaveValue('HostEvents27!');
    fireEvent.click(screen.getByRole('button',{name:'Sign in'}));
    expect(await screen.findByRole('heading',{name:'Organiser studio'})).toBeInTheDocument();
    expect(await screen.findByRole('button',{name:'Add event'})).toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
  }
});
