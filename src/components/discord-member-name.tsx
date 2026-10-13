import { getDiscordNameParts, type DiscordNameFields } from "@/lib/discord-names";

type DiscordMemberNameProps = DiscordNameFields & {
  fallbackName?: string | null;
};

export function DiscordMemberName({
  nick,
  globalName,
  username,
  fallbackName,
}: DiscordMemberNameProps) {
  const { primary, secondary } = getDiscordNameParts(
    { nick, globalName, username },
    fallbackName
  );

  return (
    <div className="min-w-0">
      <div className="whitespace-normal break-words [overflow-wrap:anywhere] text-sm text-ink">
        {primary}
      </div>
      {secondary.length > 0 ? (
        <div className="mt-0.5 whitespace-normal break-words [overflow-wrap:anywhere] text-xs leading-5 text-ink2">
          {secondary.join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
