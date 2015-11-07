Goal
=======

Create simulations of several popular distributed systems for us in explaining them and because it's fun.

Terms:

* Network: combination of the thing that delivers messages from point A to B and any monitoring and gateway activities that occur
* Node: Individual system in the group of networked systems
* Storage: Storage that each Node independently manages, basic key/value

External Read/Write messages:

* directed to a single primary server at the network gateway
* received by any node, but forwarded to the gateway
* received and forwarded to a node that manages that range of data
* received and processed by any node

Node Outages:

* Servers go offline but return to the network
* Servers go offline and are not returned to the network

Elections:

* Network elects a Primary node when communications fails (immediate)
* Network elects a Primary node when polling check detects the prior Primary is offline
* Node elections coming soon

Windows Azure Database
========================

https://azure.microsoft.com/en-us/blog/fault-tolerance-in-windows-azure-sql-database/

* 3 Nodes, 2W1R
* 1 Node is the Primary at all times (I think network selected)
* Uses consensus "similar to paxos" - I thin this is at te hardware level, not the nodes
** Practical experience: Something (not the secondary nodes) monitors the Primary Node to detect outages and force an election
** Maybe quorum is used for normal activities like handing off "primary" status to a secondary in order to receive updates?
* Node outages:
** Secondary nodes that are unavailable temporarily are cught up when brought back online
** Secondary nodes that are unavailable longer are replaced
** Primary node outages are detected by neighboring systems/monitoring and one of the secondaries is elected Primary
* All communications comes through a gateway that directs all traffic to the primary

Dynamo
========

whitepaper link here


