"""Rendu « cerveau » du graphe graphify : neurones bleus, synapses, silhouette en deux hémisphères.

Usage : python3 tools/graphify_cerveau.py [graphify-out/graph.json] [graphify-out/graph-cerveau.html]
Nécessite networkx et numpy (installés avec graphify).
"""
import json
import math
import sys
from collections import Counter
from pathlib import Path

import networkx as nx
import numpy as np

src = Path(sys.argv[1] if len(sys.argv) > 1 else 'graphify-out/graph.json')
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'graphify-out/graph-cerveau.html')
data = json.loads(src.read_text(encoding='utf-8'))

G = nx.Graph()
for n in data['nodes']:
    G.add_node(n['id'], **n)
for e in data['links']:
    if e['source'] in G and e['target'] in G and e['source'] != e['target']:
        G.add_edge(e['source'], e['target'], relation=e.get('relation', ''))

# Disposition par forces (les groupes très liés se rassemblent comme des aires cérébrales).
pos = nx.spring_layout(G, k=1.6 / math.sqrt(G.number_of_nodes()), iterations=80, seed=7)
ids = list(G.nodes)
P = np.array([pos[i] for i in ids])
P -= np.median(P, axis=0)
r = np.hypot(P[:, 0], P[:, 1])
rmax = np.percentile(r, 98)
rn = np.clip(r / rmax, 0, 1) ** 0.55
th = np.arctan2(P[:, 1], P[:, 0])


def brain_radius(t):
    """Contour d'un cerveau vu de dessus : ovale, sillon central, légers lobes."""
    a, b = 1.25, 1.0
    base = 1 / np.sqrt((np.cos(t) / a) ** 2 + (np.sin(t) / b) ** 2)
    dent = 1 - 0.2 * np.exp(-((t - np.pi / 2) / 0.17) ** 2) - 0.2 * np.exp(-((t + np.pi / 2) / 0.17) ** 2)
    lobes = 1 + 0.035 * np.sin(6 * t) + 0.02 * np.sin(11 * t + 1)
    return base * dent * lobes


R = brain_radius(th)
X = rn * R * np.cos(th)
Y = rn * R * np.sin(th)
X += np.sign(X) * 0.035  # scissure entre les deux hémisphères
X, Y = X * 500, Y * 500

# Communautés triées par taille ; couleurs dans une gamme de bleus.
comm_size = Counter(G.nodes[i].get('community', -1) for i in ids)
order = [c for c, _ in comm_size.most_common()]
cidx = {c: k for k, c in enumerate(order)}
names = {}
for i in ids:
    c = G.nodes[i].get('community', -1)
    names.setdefault(c, G.nodes[i].get('community_name') or f'Groupe {c}')
files = []
fidx = {}
deg = dict(G.degree())
nodes = []
for k, i in enumerate(ids):
    nd = G.nodes[i]
    f = str(nd.get('source_file') or '')
    if f not in fidx:
        fidx[f] = len(files)
        files.append(f)
    nodes.append([round(float(X[k]), 1), round(float(Y[k]), 1), cidx[nd.get('community', -1)], deg[i], str(nd.get('label') or i)[:80], fidx[f]])
index = {i: k for k, i in enumerate(ids)}
edges = [[index[a], index[b]] for a, b in G.edges]
comms = [[names[c], comm_size[c]] for c in order]

outline = []
for t in np.linspace(-np.pi, np.pi, 240):
    rr = brain_radius(t) * 1.06 * 500
    x = rr * math.cos(t)
    outline.append([round(x + math.copysign(17, x), 1), round(rr * math.sin(t), 1)])

payload = json.dumps({'nodes': nodes, 'edges': edges, 'comms': comms, 'files': files, 'outline': outline}, ensure_ascii=False, separators=(',', ':'))
html = Path(__file__).with_name('graphify_cerveau_template.html').read_text(encoding='utf-8')
out.write_text(html.replace('/*__DATA__*/null', payload), encoding='utf-8')
print(f'{out} : {len(nodes)} neurones, {len(edges)} synapses, {len(comms)} aires')
