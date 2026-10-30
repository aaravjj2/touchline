const roomCode=new URLSearchParams(location.search).get('room');if(roomCode&&/^[a-f0-9]{10}$/i.test(roomCode))location.replace('/duel?room='+encodeURIComponent(roomCode));
