interface LakeCloudProps {
  driftDelaySeconds?: number;
}

const LakeCloud = ({ driftDelaySeconds = 0 }: LakeCloudProps) => (
  <div className="animate-cloud-drift" style={{ animationDelay: `${driftDelaySeconds}s` }}>
    <svg width="80" height="40" viewBox="0 0 80 40">
      <ellipse cx="25" cy="25" rx="20" ry="12" fill="white" opacity="0.9" />
      <ellipse cx="45" cy="20" rx="22" ry="15" fill="white" opacity="0.9" />
      <ellipse cx="60" cy="25" rx="18" ry="10" fill="white" opacity="0.9" />
    </svg>
  </div>
);

export default LakeCloud;
