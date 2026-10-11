import asyncio
import json
import httpx
import websockets

async def test_power_house_four_users():
    base = 'http://127.0.0.1:8000/api'
    users_data = [
        ('Sarafat', 'sarafat_ph2@test.com', 'Pass123!'),
        ('Rahul', 'rahul_ph2@test.com', 'Pass123!'),
        ('Amit', 'amit_ph2@test.com', 'Pass123!'),
        ('Priya', 'priya_ph2@test.com', 'Pass123!'),
    ]
    tokens = []
    uids = []
    for name, email, pw in users_data:
        r = httpx.post(f'{base}/auth/register', json={'name': name, 'email': email, 'password': pw})
        data = r.json()
        tokens.append(data['access_token'])
        uids.append(data['user']['user_id'])
        print(f"Registered {name} -> {data['user']['user_id']}")

    async with websockets.connect(f'ws://127.0.0.1:8000/ws?token={tokens[0]}') as ws_sarafat, \
               websockets.connect(f'ws://127.0.0.1:8000/ws?token={tokens[1]}') as ws_rahul, \
               websockets.connect(f'ws://127.0.0.1:8000/ws?token={tokens[2]}') as ws_amit, \
               websockets.connect(f'ws://127.0.0.1:8000/ws?token={tokens[3]}') as ws_priya:

        # 1. Verify channel connection & presence
        sarafat_init = json.loads(await ws_sarafat.recv())
        rahul_init = json.loads(await ws_rahul.recv())
        amit_init = json.loads(await ws_amit.recv())
        priya_init = json.loads(await ws_priya.recv())
        print("All 4 clients connected to Power House global channel.")

        async def drain_until(ws, target_type):
            while True:
                msg = json.loads(await ws.recv())
                if msg['type'] == target_type:
                    return msg

        # 2. Sarafat presses PTT (requests speak)
        await ws_sarafat.send(json.dumps({'type': 'request_speak', 'data': {}}))
        grant_msg = await drain_until(ws_sarafat, 'speak_granted')
        print(f"Sarafat speak request response: {grant_msg['type']}")

        # 3. Listeners receive speaker_started
        speaker_start = await drain_until(ws_rahul, 'speaker_started')
        print(f"Rahul received broadcast: speaker_started -> {speaker_start['data']['speaker_name']}")

        # 4. Rahul attempts to speak while Sarafat holds the lock -> MUST BE DENIED
        await ws_rahul.send(json.dumps({'type': 'request_speak', 'data': {}}))
        rahul_denied = await drain_until(ws_rahul, 'speak_denied')
        print(f"Rahul lock attempt while Sarafat speaking: {rahul_denied['type']} - {rahul_denied.get('data', {}).get('reason')}")
        assert rahul_denied['type'] == 'speak_denied', 'Rahul should be denied!'

        # 5. Sarafat sends WebRTC offer for live channel
        await ws_sarafat.send(json.dumps({
            'type': 'webrtc_offer',
            'target_user_id': uids[1],
            'data': {'sdp': 'v=0\r\no=sarafat 12345 2 IN IP4 127.0.0.1\r\ns=PowerHouseAudio'}
        }))
        rahul_offer = await drain_until(ws_rahul, 'webrtc_offer')
        print(f"Rahul received live WebRTC offer from {rahul_offer.get('from_user_id')}")

        # 6. Sarafat releases PTT
        await ws_sarafat.send(json.dumps({'type': 'release_speak', 'data': {}}))
        print("Sarafat released PTT.")

        # 7. Listeners receive speaker_stopped
        stop_msg = await drain_until(ws_amit, 'speaker_stopped')
        print("Amit received broadcast: speaker_stopped")

        # 8. Now Rahul requests speak -> MUST SUCCEED
        await asyncio.sleep(0.15)
        await ws_rahul.send(json.dumps({'type': 'request_speak', 'data': {}}))
        grant_rahul = await drain_until(ws_rahul, 'speak_granted')
        print(f"Rahul speak request response after Sarafat released: {grant_rahul['type']}")

        # 9. Rahul releases PTT
        await ws_rahul.send(json.dumps({'type': 'release_speak', 'data': {}}))
        print("Rahul released PTT.")

        print("SUCCESS: ALL 4-USER CONCURRENT VERIFICATIONS PASSED CLEANLY!")

if __name__ == '__main__':
    asyncio.run(test_power_house_four_users())
