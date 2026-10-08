import sys
path = "src/components/RoutingArchitecture.tsx"
lines = open(path).read().splitlines(keepends=True)
print("TOTAL LINES:", len(lines))
print("TOTAL BYTES:", len(open(path,'rb').read()))
for i in range(809, min(878, len(lines))):
    print("L%03d|%r" % (i+1, lines[i][:160]))
