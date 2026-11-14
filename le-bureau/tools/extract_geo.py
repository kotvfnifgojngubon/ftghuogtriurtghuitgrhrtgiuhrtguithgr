"""Extrait de Natural Earth (domaine public) les données carto du jeu.
Usage: python3 -I extract_geo.py <dossier_ne> <sortie.js>"""
import json, sys, math

src, out = sys.argv[1], sys.argv[2]

def rings(geom):
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    return [poly[0] for poly in polys]  # anneaux extérieurs uniquement

def perp(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == dy == 0:
        return math.hypot(x - x1, y - y1)
    t = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - x1 - t * dx, y - y1 - t * dy)

def dp(pts, tol):
    if len(pts) < 3:
        return pts
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = perp(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        return dp(pts[:idx + 1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]

def clip(ring, x0, y0, x1, y1):
    """Sutherland-Hodgman sur une fenêtre rectangulaire."""
    def edge(pts, inside, inter):
        res = []
        for i in range(len(pts)):
            cur, prev = pts[i], pts[i - 1]
            if inside(cur):
                if not inside(prev):
                    res.append(inter(prev, cur))
                res.append(cur)
            elif inside(prev):
                res.append(inter(prev, cur))
        return res
    def ix(xc):
        return lambda a, b: (xc, a[1] + (b[1] - a[1]) * (xc - a[0]) / (b[0] - a[0]))
    def iy(yc):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (yc - a[1]) / (b[1] - a[1]), yc)
    pts = [tuple(p) for p in ring]
    for inside, inter in ((lambda p: p[0] >= x0, ix(x0)), (lambda p: p[0] <= x1, ix(x1)),
                          (lambda p: p[1] >= y0, iy(y0)), (lambda p: p[1] <= y1, iy(y1))):
        if not pts:
            break
        pts = edge(pts, inside, inter)
    return pts

def r4(ring):
    return [[round(x, 4), round(y, 4)] for x, y in ring]

ids = {'West Flanders': ('wvl', 'Flandre-Occidentale', 'flandre'),
       'East Flanders': ('ovl', 'Flandre-Orientale', 'flandre'),
       'Antwerp': ('ant', 'Anvers', 'flandre'),
       'Limburg': ('lim', 'Limbourg', 'flandre'),
       'Flemish Brabant': ('vbr', 'Brabant flamand', 'flandre'),
       'Brussels': ('bru', 'Bruxelles-Capitale', 'bruxelles'),
       'Walloon Brabant': ('wbr', 'Brabant wallon', 'wallonie'),
       'Hainaut': ('hai', 'Hainaut', 'wallonie'),
       'Namur': ('nam', 'Namur', 'wallonie'),
       'Liege': ('lie', 'Liège', 'wallonie'),
       'Luxembourg': ('lux', 'Luxembourg', 'wallonie')}

adm1 = json.load(open(f'{src}/ne_10m_admin_1_states_provinces.geojson'))
provinces = []
for f in adm1['features']:
    p = f['properties']
    if p.get('adm0_a3') != 'BEL':
        continue
    pid, name, region = ids[p['name']]
    provinces.append({'id': pid, 'name': name, 'region': region,
                      'rings': [r4(dp([tuple(c) for c in r], 0.002)) for r in rings(f['geometry'])]})
provinces.sort(key=lambda p: list(ids.values()).index((p['id'], p['name'], p['region'])))

adm0 = json.load(open(f'{src}/ne_10m_admin_0_countries.geojson'))
names = {'NLD': 'PAYS-BAS', 'FRA': 'FRANCE', 'DEU': 'ALLEMAGNE', 'LUX': 'LUXEMBOURG', 'GBR': 'ROYAUME-UNI', 'BEL': 'BELGIQUE'}
box = (1.2, 48.9, 7.6, 52.25)
neighbours = []
for f in adm0['features']:
    p = f['properties']
    code = p.get('ADM0_A3')
    if code not in names:
        continue
    out_rings = []
    for r in rings(f['geometry']):
        xs = [c[0] for c in r]; ys = [c[1] for c in r]
        if max(xs) < box[0] or min(xs) > box[2] or max(ys) < box[1] or min(ys) > box[3]:
            continue
        c = clip(dp([tuple(q) for q in r], 0.003), *box)
        if len(c) >= 3:
            out_rings.append(r4(c))
    if out_rings:
        neighbours.append({'code': code, 'name': names[code], 'rings': out_rings})

w50 = json.load(open(f'{src}/ne_50m_admin_0_countries.geojson'))
world = []
for f in w50['features']:
    for r in rings(f['geometry']):
        s = dp([tuple(q) for q in r], 0.35)
        if len(s) >= 4:
            world.append([v for x, y in s for v in (round(x * 10), round(y * 10))])

data = {'provinces': provinces, 'neighbours': neighbours, 'world': world,
        'source': 'Natural Earth (domaine public), naturalearthdata.com'}
with open(out, 'w') as fh:
    fh.write('// Généré par tools/extract_geo.py depuis Natural Earth (domaine public).\n')
    fh.write('// Provinces belges (10m), pays voisins découpés (10m), monde simplifié (50m, x10).\n')
    fh.write('export default ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('provinces', len(provinces), 'pts', sum(len(r) for p in provinces for r in p['rings']))
print('voisins', [(n['code'], sum(len(r) for r in n['rings'])) for n in neighbours])
print('monde anneaux', len(world))
