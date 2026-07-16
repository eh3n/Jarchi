#!/usr/bin/liquidsoap
# Jarchi audio engine: sources (radio/playlist/spotify/airplay), queues,
# additive paging mix with file-driven state and ducking. Liquidsoap 2.0.x.

settings.log.file.set(true)
settings.log.file.path.set("/var/log/paging/liquidsoap.log")
settings.log.level.set(3)

settings.server.telnet.set(true)
settings.server.telnet.bind_addr.set("127.0.0.1")
settings.server.telnet.port.set(1234)
settings.server.timeout.set(-1.)

state_dir = "/opt/jarchi/liquidsoap/state"

dev_file = "/opt/jarchi/liquidsoap/alsa_device.conf"
alsa_device =
  if file.exists(dev_file) then string.trim(file.contents(dev_file)) else "default" end

def mk_state(~interval=2., fname, default) =
  cached = ref(default)
  last = ref(0.)
  path = "#{state_dir}/#{fname}"
  def getter() =
    if time() - !last > interval then
      last := time()
      if file.exists(path) then cached := string.trim(file.contents(path)) end
    end
    !cached
  end
  getter
end

active_source = mk_state("active_source.txt", "off")
volume_str    = mk_state("volume.txt", "0.85")
volume_level  = fun () -> float_of_string(default=0.85, volume_str())

duck_str   = mk_state(interval=0.5, "duck.txt", "1.0")
duck_level = fun () -> float_of_string(default=1.0, duck_str())

radio_initial =
  if file.exists("#{state_dir}/radio_url.txt") then
    string.trim(file.contents("#{state_dir}/radio_url.txt"))
  else
    "https://stream.radioparadise.com/mp3-192"
  end

np_file = "/tmp/paging/now_playing.json"

def write_now_playing(kind, m) =
  payload = json.stringify({
    source = kind, title = m["title"], artist = m["artist"],
    filename = m["filename"], duration = m["duration"], started_at = time()
  })
  file.write(data=payload, np_file)
end

paging_raw =
  input.external.rawaudio(
    buffer=0.1, max=10., restart=true, restart_on_error=true,
    samplerate=44100, channels=2,
    "bash -c 'while [ ! -p /tmp/paging/page_audio.sln ]; do sleep 3; done; exec sox -q --buffer 512 -t raw -r 8000 -c 1 -b 16 -e signed /tmp/paging/page_audio.sln -t raw -r 44100 -c 2 -b 16 -e signed - 2>/dev/null'"
  )
paging = blank.strip(max_blank=2., min_noise=0.1, threshold=-45., paging_raw)

spotify_raw =
  input.external.rawaudio(
    buffer=0.2, max=10., restart=true, restart_on_error=true,
    samplerate=44100, channels=2,
    "bash -c 'while [ ! -p /tmp/paging/spotify_audio ]; do sleep 3; done; exec cat /tmp/paging/spotify_audio'"
  )
spotify = mksafe(spotify_raw)

airplay_raw =
  input.external.rawaudio(
    buffer=0.2, max=10., restart=true, restart_on_error=true,
    samplerate=44100, channels=2,
    "bash -c 'while [ ! -p /tmp/paging/airplay_audio ]; do sleep 3; done; exec cat /tmp/paging/airplay_audio'"
  )
airplay = mksafe(airplay_raw)

test_q = request.queue(id="testq")
bell_q = request.queue(id="bellq")
musicq = request.queue(id="musicq")

radio_src = input.http(id="radio_stream", radio_initial)
radio_src.on_metadata(fun (m) ->
  if active_source() == "radio" then write_now_playing("radio", m) end)
radio = mksafe(radio_src)

musicq.on_track(fun (m) -> write_now_playing("playlist", m))
playlist_branch = mksafe(musicq)

silence = blank(duration=2.)

background =
  switch(track_sensitive=false,
    [
      ({active_source() == "radio"}, radio),
      ({active_source() == "playlist"}, playlist_branch),
      ({active_source() == "spotify"}, spotify),
      ({active_source() == "airplay"}, airplay),
      ({true}, silence)
    ])

background = buffer(buffer=2., max=6., background)
background = amplify(volume_level, background)
background = amplify(duck_level, background)

announce = fallback(track_sensitive=false,
                    [paging, test_q, bell_q, blank(id="announce_floor")])
final = add(normalize=false, [background, announce])

def skip_handler(_) =
  source.skip(musicq)
  "OK"
end
server.register(namespace="player", description="Skip current queued track",
                usage="next", "next", skip_handler)

def seek_handler(arg) =
  delta = float_of_string(default=0., arg)
  moved = source.seek(musicq, delta)
  "seeked #{moved}"
end
server.register(namespace="player", description="Seek within current track",
                usage="seek <seconds>", "seek", seek_handler)

output.alsa(device=alsa_device, final)
