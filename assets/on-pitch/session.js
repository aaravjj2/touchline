// Two seats. The away seat is bots until someone on this keyboard takes it.
export function session(away = 'bot') {
  return {
    mode: away === 'human' ? 'local' : 'bots',
    seats: ['human', away],
    send() {},
    receive() { return null; },
  };
}
