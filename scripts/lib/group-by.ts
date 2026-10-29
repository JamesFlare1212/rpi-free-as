export function groupBy<T,K>(rows:Iterable<T>,key:(row:T)=>K):Map<K,T[]> {
 const groups=new Map<K,T[]>();
 for(const row of rows){const k=key(row);const group=groups.get(k);if(group)group.push(row);else groups.set(k,[row]);}
 return groups;
}
